import { INFLUX_BUCKET } from "../config";
import { round2 } from "../stats";
import { Point, Reading } from "../types";
import { runQuery } from "./client";
import { InfluxSeriesRef } from "./metricMap";


// Escapes double quotes and backslashes for safe interpolation into Flux queries.
const q = (v: string): string => v.replace(/["\\]/g, "\\$&");

// Builds a Flux filter expression matching the series measurement, field,
// and any configured tag values, escaping interpolated strings safely.
function seriesFilter(ref: InfluxSeriesRef): string {
  let f = `r._measurement == "${q(ref.measurement)}" and r._field == "${q(ref.field)}"`;
  for (const [key, value] of Object.entries(ref.tags ?? {})) {
    f += ` and r["${q(key)}"] == "${q(value)}"`;
  }
  return f;
}

// Builds a Flux filter expression matching any of the provided series.
function batchFilter(refs: Iterable<InfluxSeriesRef>): string {
  return [...new Set([...refs].map((ref) => `(${seriesFilter(ref)})`))].join(" or ");
}

interface SeriesRow {
  _measurement: string;
  _field: string;
  [tag: string]: unknown;
}

interface Row extends SeriesRow {
  _time: string;
  _value: number | boolean;
}

function toNumber(v: number | boolean): number {
  return typeof v === "boolean" ? (v ? 1 : 0) : v;
}

// Checks whether a row matches a series by measurement, field, and tags.
function rowMatchesRef(row: SeriesRow, ref: InfluxSeriesRef): boolean {
  return (
    row._measurement === ref.measurement &&
    row._field === ref.field &&
    Object.entries(ref.tags ?? {}).every(([tag, value]) => row[tag] === value)
  );
}




export async function queryFieldsByTag(
  tag: string,
  measurement: string,
  start: string
): Promise<{ value: string; field: string }[]> {
  const flux = `
from(bucket: "${q(INFLUX_BUCKET)}")
  |> range(start: ${start})
  |> filter(fn: (r) => r._measurement == "${q(measurement)}")
  |> group(columns: ["${q(tag)}", "_field"])
  |> first()
  |> keep(columns: ["${q(tag)}", "_field"])`;

  const rows = await runQuery<Record<string, unknown>>(flux);
  return rows.flatMap((row) => {
    const value = row[tag];
    const field = row._field;
    // Rows without the tag belong to some other writer sharing the measurement.
    return typeof value === "string" && value && typeof field === "string"
      ? [{ value, field }]
      : [];
  });
}

export async function queryWindowBatch(
  refs: Record<string, InfluxSeriesRef>,
  start: string,
  every: string,
  fn: "mean" | "last" | "max" | "min" = "last"
): Promise<Record<string, Point[]>> {
  const entries = Object.entries(refs);
  const result: Record<string, Point[]> = Object.fromEntries(entries.map(([key]) => [key, []]));
  if (!entries.length) return result;

  const flux = `
from(bucket: "${q(INFLUX_BUCKET)}")
  |> range(start: ${start})
  |> filter(fn: (r) => ${batchFilter(entries.map(([, ref]) => ref))})
  |> aggregateWindow(every: ${every}, fn: ${fn}, createEmpty: false)`;

  const rows = await runQuery<Row>(flux);
  for (const row of rows) {
    if (typeof row._value !== "number" && typeof row._value !== "boolean") continue;
    const point = { time: new Date(row._time).getTime(), value: round2(toNumber(row._value)) };
    for (const [key, ref] of entries) {
      if (rowMatchesRef(row, ref)) result[key].push(point);
    }
  }
  return result;
}

export interface Aggregates {
  min: number;
  max: number;
  mean: number;
  last: number;
  count: number;
}


export async function queryStatsBatch(
  refs: Record<string, InfluxSeriesRef>,
  start: string
): Promise<Record<string, Aggregates>> {
  const entries = Object.entries(refs);
  if (!entries.length) return {};

  const flux = `
data = from(bucket: "${q(INFLUX_BUCKET)}")
  |> range(start: ${start})
  |> filter(fn: (r) => ${batchFilter(entries.map(([, ref]) => ref))})

agg = (t, name) =>
  t |> toFloat() |> drop(columns: ["_time", "_start", "_stop"]) |> set(key: "agg", value: name)

union(tables: [
  agg(t: data |> min(), name: "min"),
  agg(t: data |> max(), name: "max"),
  agg(t: data |> mean(), name: "mean"),
  agg(t: data |> last(), name: "last"),
  agg(t: data |> count(), name: "count"),
])`;

  type AggRow = SeriesRow & { agg: string; _value: number };
  const rows = await runQuery<AggRow>(flux);
  const result: Record<string, Aggregates> = {};
  for (const [key, ref] of entries) {
    const byAgg: Record<string, number> = {};
    for (const row of rows) {
      if (rowMatchesRef(row, ref)) byAgg[row.agg] = row._value;
    }
    if (!(byAgg.count > 0)) continue;
    result[key] = {
      min: round2(byAgg.min),
      max: round2(byAgg.max),
      mean: round2(byAgg.mean),
      last: round2(byAgg.last),
      count: byAgg.count,
    };
  }
  return result;
}


export async function queryLastBatch(
  refs: Record<string, InfluxSeriesRef>
): Promise<Record<string, Reading>> {
  const entries = Object.entries(refs);
  if (!entries.length) return {};

  const flux = `
from(bucket: "${q(INFLUX_BUCKET)}")
  |> range(start: -15m)
  |> filter(fn: (r) => ${batchFilter(entries.map(([, ref]) => ref))})
  |> last()`;

  const rows = await runQuery<Row>(flux);
  const result: Record<string, Reading> = {};
  for (const [key, ref] of entries) {
    const row = rows.find((r) => rowMatchesRef(r, ref));
    if (!row || (typeof row._value !== "number" && typeof row._value !== "boolean")) continue;
    const at = new Date(row._time).getTime();
    if (Number.isNaN(at)) continue;
    result[key] = { value: round2(toNumber(row._value)), at };
  }
  return result;
}
