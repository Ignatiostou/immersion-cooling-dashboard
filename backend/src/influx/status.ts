import { cacheGet, cacheSet } from "../cache/redisClient";
import { rangeCacheTtl, statusKey } from "../cache/keys";
import { singleFlight } from "../cache/singleFlight";
import { everyToSeconds, RANGE_QUERY } from "../ranges";
import { Point, Range, StatusSegment, StatusTimeline } from "../types";
import { coolantLevelLabel, statusRefs } from "./metricMap";
import { queryWindowBatch } from "./query";


export function toSegments(
  points: Point[],
  toState: (v: number) => string,
  end: number
): StatusSegment[] {
  const segments: StatusSegment[] = [];
  for (let i = 0; i < points.length; i++) {
    const state = toState(points[i].value);
    const segEnd = i + 1 < points.length ? points[i + 1].time : end;
    const prev = segments[segments.length - 1];
    if (prev && prev.state === state) {
      prev.end = segEnd;
    } else {
      segments.push({ start: points[i].time, end: segEnd, state });
    }
  }
  return segments;
}

interface StatusSeries {
  p1: Point[];
  p2: Point[];
  alarmPts: Point[];
  level: Point[];
}

async function fetchStatusSeries(serial: string, range: Range): Promise<StatusSeries> {
  const key = statusKey(serial, range);
  const cached = await cacheGet<StatusSeries>(key);
  if (cached) return cached;

  // Everyone who missed the cache together waits on one query, not one each.
  return singleFlight(key, () => queryStatusSeries(serial, range, key));
}

async function queryStatusSeries(
  serial: string,
  range: Range,
  key: string
): Promise<StatusSeries> {
  const q = RANGE_QUERY[range];
  const {
    pump1Running: p1,
    pump2Running: p2,
    pump1Error: e1,
    pump2Error: e2,
    coolantPointLevel: level,
  } = await queryWindowBatch(statusRefs(serial), q.start, q.every, "last");


  const byTime = new Map<number, number>();
  for (const p of [...e1, ...e2]) {
    byTime.set(p.time, Math.max(p.value, byTime.get(p.time) ?? 0));
  }

  const alarmPts = [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, value]) => ({ time, value }));

  const series: StatusSeries = { p1, p2, alarmPts, level };
  await cacheSet(key, series, rangeCacheTtl(range, everyToSeconds(q.every)));
  return series;
}

export async function buildStatusTimelines(
  serial: string,
  range: Range
): Promise<StatusTimeline[]> {
  const now = Date.now();
  const start = now - RANGE_QUERY[range].durationMs;
  const constant = (signal: string, state: string): StatusTimeline => ({
    signal,
    segments: [{ start, end: now, state }],
  });

  let pump1: StatusTimeline | null = null;
  let pump2: StatusTimeline | null = null;
  let pumpAlarm: StatusTimeline | null = null;
  let coolantLevel: StatusTimeline | null = null;
  try {
    const { p1, p2, alarmPts, level } = await fetchStatusSeries(serial, range);
    const onOff = (v: number) => (v > 0 ? "On" : "Off");
    if (p1.length) pump1 = { signal: "Pump 1 Status", segments: toSegments(p1, onOff, now) };
    if (p2.length) pump2 = { signal: "Pump 2 Status", segments: toSegments(p2, onOff, now) };
    if (alarmPts.length) {
      pumpAlarm = {
        signal: "Pump Alarm Status",
        segments: toSegments(alarmPts, (v) => (v > 0 ? "True" : "False"), now),
      };
    }

    if (level?.length) {
      coolantLevel = {
        signal: "Coolant Point Level",
        segments: toSegments(level, coolantLevelLabel, now),
      };
    }
  } catch (err) {
    console.error("[influx] status query failed:", (err as Error).message);
  }

  return [
    constant("Global Alarm Status", "False"),
    pumpAlarm ?? constant("Pump Alarm Status", "False"),
    constant("Unit Status", "Stand By"),
    constant("Compressor Status", "Off"),
    constant("Condenser Fans Status", "Off"),
    pump1 ?? constant("Pump 1 Status", "Off"),
    pump2 ?? constant("Pump 2 Status", "Off"),
    constant("Pump 1 Mode", "Auto"),
    constant("Pump 2 Mode", "Auto"),
    coolantLevel ?? constant("Coolant Point Level", "Sufficient"),
  ];
}
