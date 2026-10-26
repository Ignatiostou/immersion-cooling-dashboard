import type { Range } from "../types";
import { intervalToMs, type DurationToken } from "./refresh";

export const MAX_POINTS = 1200;

/** Above this many points per series, per-point dots are hidden (clutter + cost);
 *  the line still renders. Keeps symbols readable and cheap on dense windows. */
export const SYMBOL_MAX_POINTS = 500;


export interface RangeMeta {
  label: string;
  durationMs: number;
  defaultEvery: DurationToken;
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const RANGES: Record<Range, RangeMeta> = {
  "5m": { label: "Last 5 minutes", durationMs: 5 * MIN, defaultEvery: "5s" },
  "15m": { label: "Last 15 minutes", durationMs: 15 * MIN, defaultEvery: "15s" },
  "30m": { label: "Last 30 minutes", durationMs: 30 * MIN, defaultEvery: "30s" },
  "1h": { label: "Last 1 hour", durationMs: HOUR, defaultEvery: "1m" },
  "6h": { label: "Last 6 hours", durationMs: 6 * HOUR, defaultEvery: "5m" },
  "1d": { label: "Last 24 hours", durationMs: DAY, defaultEvery: "5m" },
  "7d": { label: "Last 7 days", durationMs: 7 * DAY, defaultEvery: "1h" },
  "30d": { label: "Last 30 days", durationMs: 30 * DAY, defaultEvery: "4h" },
};

export const RANGE_ORDER: Range[] = ["5m", "15m", "30m", "1h", "6h", "1d", "7d", "30d"];

export const DEFAULT_RANGE: Range = "30m";


export function effectiveEvery(range: Range, pointInterval: DurationToken | null): DurationToken {
  return pointInterval ?? RANGES[range].defaultEvery;
}


export function intervalFitsRange(token: DurationToken, range: Range): boolean {
  const ms = intervalToMs(token);
  const { durationMs } = RANGES[range];
  return ms < durationMs && durationMs / ms <= MAX_POINTS;
}



export function rangeShowsSymbols(range: Range): boolean {
  return RANGES[range].durationMs <= DAY;
}


export function formatBucket(ms: number): string {
  if (ms < MIN) return `${Math.round(ms / SEC)} s`;
  if (ms < HOUR) return `${Math.round(ms / MIN)} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  return `${Math.round(ms / DAY)} d`;
}
