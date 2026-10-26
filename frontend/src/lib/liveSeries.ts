import { RunningStats } from "./stats.ts";
import type { Point, Reading, Stats } from "../types";


export type BufferPoint = [number, number];

export interface Limits {
  min: number;
  max: number;
}

export interface IntervalAcc {
  end: number;
  last: number;
  min: number;
  max: number;
}


export interface SeriesState {
  buf: BufferPoint[];
  acc: IntervalAcc;
  stats: RunningStats;
  lastAt: number;
}

export const emptyAcc = (): IntervalAcc => ({
  end: 0,
  last: 0,
  min: Infinity,
  max: -Infinity,
});

export const emptyState = (): SeriesState => ({
  buf: [],
  acc: emptyAcc(),
  stats: new RunningStats(),
  lastAt: 0,
});


export const resetStates = (count: number): SeriesState[] =>
  Array.from({ length: count }, emptyState);

export function seedState(points: readonly Point[], stats: Stats | null, cap: number): SeriesState {
  return {
    buf: [...points]
      .sort((a, b) => a.time - b.time)
      .map((p): BufferPoint => [p.time, p.value])
      .slice(-cap),
    acc: emptyAcc(),
    stats: RunningStats.fromStats(stats),
    lastAt: 0,
  };
}


export function peakValue(acc: IntervalAcc, limits?: Limits): number {
  if (!limits) return acc.last;
  const over = acc.max - limits.max;
  const under = limits.min - acc.min;
  if (over > 0 || under > 0) return over >= under ? acc.max : acc.min;
  return acc.last;
}


export function commitInterval(state: SeriesState, cap: number, limits?: Limits): void {
  const { buf, acc } = state;
  const value = peakValue(acc, limits);

  if (buf.length && buf[buf.length - 1][0] >= acc.end) {
    buf[buf.length - 1][1] = value;
  } else {
    buf.push([acc.end, value]);
  }
  while (buf.length > cap) buf.shift();
}

export function applyReading(
  state: SeriesState,
  reading: Reading | null,
  intervalEnd: number,
  cap: number,
  limits?: Limits
): boolean {
  if (reading && reading.at === state.lastAt) return false;
  state.lastAt = reading?.at ?? 0;

  const value = reading ? reading.value : NaN;
  state.stats.push(value);

  const { acc } = state;
  if (acc.end === intervalEnd) {
    acc.last = value;
    if (value < acc.min) acc.min = value;
    if (value > acc.max) acc.max = value;
    return false;
  }

  const closed = acc.end !== 0;
  if (closed) commitInterval(state, cap, limits);
  acc.end = intervalEnd;
  acc.last = value;
  acc.min = value;
  acc.max = value;
  return closed;
}

/** The interval a tick belongs to, named by the boundary it closes at. */
export const intervalEndFor = (timestamp: number, intervalMs: number): number =>
  Math.ceil(timestamp / intervalMs) * intervalMs;
