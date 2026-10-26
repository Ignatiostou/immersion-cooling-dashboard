import { Range } from "./types";

export const RANGE_QUERY: Record<Range, { start: string; every: string; durationMs: number }> = {
  "5m": { start: "-5m", every: "5s", durationMs: 5 * 60 * 1000 },
  "15m": { start: "-15m", every: "15s", durationMs: 15 * 60 * 1000 },
  "30m": { start: "-30m", every: "30s", durationMs: 30 * 60 * 1000 },
  "1h": { start: "-1h", every: "1m", durationMs: 3600 * 1000 },
  "6h": { start: "-6h", every: "5m", durationMs: 6 * 3600 * 1000 },
  "1d": { start: "-1d", every: "5m", durationMs: 24 * 3600 * 1000 },
  "7d": { start: "-7d", every: "1h", durationMs: 7 * 24 * 3600 * 1000 },
  "30d": { start: "-30d", every: "4h", durationMs: 30 * 24 * 3600 * 1000 },
};

export function isRange(v: unknown): v is Range {
  return typeof v === "string" && v in RANGE_QUERY;
}

const EVERY_RE = /^(\d+)(s|m|h|d)$/;
const EVERY_UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
const MAX_WINDOW_POINTS = 2000;

function everyToMs(every: string): number | null {
  const match = EVERY_RE.exec(every);
  if (!match) return null;
  return Number(match[1]) * EVERY_UNIT_MS[match[2] as keyof typeof EVERY_UNIT_MS];
}

export function everyToSeconds(every: string): number {
  const ms = everyToMs(every);
  return ms === null ? 60 : ms / 1000;
}

//Check if the range is valid and if the every is valid for the range. If not, return the default every for the range.
export function resolveEvery(v: unknown, range: Range): string {
  if (typeof v !== "string") return RANGE_QUERY[range].every;
  const ms = everyToMs(v);
  if (ms === null) return RANGE_QUERY[range].every;
  const { durationMs } = RANGE_QUERY[range];
  if (ms < 1000 || ms >= durationMs || durationMs / ms > MAX_WINDOW_POINTS) {
    return RANGE_QUERY[range].every;
  }
  return v;
}
