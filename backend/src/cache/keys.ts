import type { MetricSpec } from "../influx/history";
import { MEASUREMENT } from "../influx/metricMap";
import { Range } from "../types";


const scope = (serial: string) => `${serial || "any"}:${MEASUREMENT}`;

export const SNAPSHOT_TTL = 10;

export const snapshotKey = (serial: string) => `${scope(serial)}:snapshot`;

export const statusKey = (serial: string, range: Range) =>
  `${scope(serial)}:history:status:range=${range}`;

export function historyKey(
  serial: string,
  range: Range,
  every: string,
  specs: MetricSpec[]
): string {
  const metrics = [...specs]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((s) => (s.limits ? `${s.key}[${s.limits.min}..${s.limits.max}]` : s.key))
    .join(",");
  return `${scope(serial)}:history:range=${range}:every=${every}:metrics=${metrics}`;
}


export function rangeCacheTtl(range: Range, everySeconds: number): number {
  if (range === "5m" || range === "15m" || range === "30m" || range === "1h") {
    return Math.min(everySeconds, 10);
  }
  if (range === "6h" || range === "1d") return Math.min(everySeconds, 30);
  return Math.min(everySeconds, 60);
}
