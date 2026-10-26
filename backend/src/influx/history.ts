import { RANGE_QUERY } from "../ranges";
import { computeStats, round2 } from "../stats";
import { Point, Range, Stats } from "../types";
import { InfluxSeriesRef, metricRef } from "./metricMap";
import { queryStatsBatch, queryWindowBatch } from "./query";

export interface Limits {
  min: number;
  max: number;
}

export interface MetricSpec {
  key: string;
  limits?: Limits;
}

export interface MetricHistory {
  points: Point[];
  stats: Stats;
}

// Computes the delta between two time-aligned series by subtracting the older
// series values (a) from the newer series values (b) at matching timestamps.
function diffSeries(b: Point[], a: Point[]): Point[] {
  const aByTime = new Map(a.map((p) => [p.time, p.value]));
  return b
    .filter((p) => aByTime.has(p.time))
    .map((p) => ({ time: p.time, value: round2(p.value - aByTime.get(p.time)!) }));
}


export function mergePeakSeries(
  last: Point[],
  max: Point[],
  min: Point[],
  limits?: Limits
): Point[] {
  if (!limits) return last.map((p) => ({ time: p.time, value: round2(p.value) }));
  const maxByTime = new Map(max.map((p) => [p.time, p.value]));
  const minByTime = new Map(min.map((p) => [p.time, p.value]));
  return last.map((p) => {
    const wMax = maxByTime.get(p.time) ?? p.value;
    const wMin = minByTime.get(p.time) ?? p.value;
    let value = p.value;
    const over = wMax - limits.max;
    const under = limits.min - wMin;
    if (over > 0 || under > 0) value = over >= under ? wMax : wMin;
    return { time: p.time, value: round2(value) };
  });
}


function refsFor(serial: string, keys: readonly string[]): Record<string, InfluxSeriesRef> {
  const refKeys = new Set(keys.filter((key) => key !== "deltaTc"));
  if (keys.includes("deltaTc")) {
    refKeys.add("coolantInput");
    refKeys.add("coolantOutput");
  }
  const refs: Record<string, InfluxSeriesRef> = {};
  for (const key of refKeys) {
    const ref = metricRef(key, serial);
    if (ref) refs[key] = ref;
  }
  return refs;
}

// Queries time-windowed metric values in one batch, applies optional peak-based
// limit handling, and derives deltaTc from the coolant output and input series.
export async function metricWindowBatch(
  serial: string,
  keys: readonly string[],
  start: string,
  every: string,
  limitsByKey: Record<string, Limits | undefined> = {}
): Promise<Record<string, Point[] | null>> {
  const refs = refsFor(serial, keys);

  
  const needsPeaks = Object.values(limitsByKey).some(Boolean);
  const noPeaks: Record<string, Point[]> = {};
  const [lasts, maxs, mins] = await Promise.all([
    queryWindowBatch(refs, start, every, "last"),
    needsPeaks ? queryWindowBatch(refs, start, every, "max") : noPeaks,
    needsPeaks ? queryWindowBatch(refs, start, every, "min") : noPeaks,
  ]);

  const result: Record<string, Point[] | null> = {};
  for (const key of keys) {
    if (key === "deltaTc") {
      result[key] =
        refs.coolantInput && refs.coolantOutput
          ? diffSeries(lasts.coolantOutput, lasts.coolantInput)
          : null;
    } else {
      result[key] = refs[key]
        ? mergePeakSeries(lasts[key], maxs[key] ?? [], mins[key] ?? [], limitsByKey[key])
        : null;
    }
  }
  return result;
}

// Builds metric history by loading windowed points and aggregate statistics,
// then fills in derived or unavailable metrics with statistics computed from
// their returned points.
export async function buildHistory(
  serial: string,
  specs: MetricSpec[],
  range: Range,
  every: string
): Promise<Record<string, MetricHistory>> {
  const keys = specs.map((s) => s.key);
  const limitsByKey = Object.fromEntries(specs.map((s) => [s.key, s.limits]));
  const start = RANGE_QUERY[range].start;
  const [windows, aggs] = await Promise.all([
    metricWindowBatch(serial, keys, start, every, limitsByKey),
    queryStatsBatch(refsFor(serial, keys), start),
  ]);

  const out: Record<string, MetricHistory> = {};
  for (const key of keys) {
    const points = windows[key] ?? [];
    const agg = aggs[key];
    out[key] = {
      points,
      // deltaTc (and any metric Influx has no series for) falls back to the
      // points, which is all there is — it is derived, not stored.
      stats: agg ?? computeStats(points),
    };
  }
  return out;
}
