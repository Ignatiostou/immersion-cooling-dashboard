const UNIT_MS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

type DurationUnit = keyof typeof UNIT_MS;


export type DurationToken = `${number}${DurationUnit}`;


export const POINT_INTERVALS = [
  "5s",
  "10s",
  "30s",
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "12h",
  "1d",
] as const satisfies readonly DurationToken[];

export type PointInterval = (typeof POINT_INTERVALS)[number];

export function intervalToMs(token: DurationToken): number {
  const match = /^(\d+)([smhd])$/.exec(token);
  if (!match) throw new Error(`Invalid duration token "${token}" — expected e.g. "30s", "5m", "2h", "1d"`);
  return Number(match[1]) * UNIT_MS[match[2] as DurationUnit];
}
