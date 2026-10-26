import type { Point, Range, Snapshot, Stats, StatusTimeline } from "../types";
import type { DurationToken } from "../config/refresh";
import { API_BASE } from "./config";

export interface MetricHistory {
  points: Point[];
  stats: Stats;
}

export interface HistoryReq {
  metric: string;
  limits?: { min: number; max: number };
}

async function getJson<T>(path: string, signal?: AbortSignal, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

/** Empty values are dropped, so an unset serial leaves the backend on its default. */
function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const out = search.toString();
  return out ? `?${out}` : "";
}


export interface Tank {
  serial: string;
  metrics: string[];
}

export function fetchTanks(signal?: AbortSignal): Promise<Tank[]> {
  return getJson<{ tanks: Tank[] }>("/api/tanks", signal).then((r) => r.tanks);
}

export function fetchSnapshot(serial: string, signal?: AbortSignal): Promise<Snapshot> {
  return getJson<Snapshot>(`/api/snapshot${qs({ serial })}`, signal);
}


export function fetchHistoryBatch(
  reqs: HistoryReq[],
  range: Range,
  serial: string,
  every?: DurationToken,
  signal?: AbortSignal
): Promise<Record<string, MetricHistory>> {
  const metrics = reqs
    .map((r) => (r.limits ? `${r.metric}:${r.limits.min}:${r.limits.max}` : r.metric))
    .join(",");
  return getJson<{ series: Record<string, MetricHistory> }>(
    `/api/history${qs({ metrics, range, every, serial })}`,
    signal
  ).then((r) => r.series);
}

export function fetchStatusTimeline(
  range: Range,
  serial: string,
  signal?: AbortSignal
): Promise<StatusTimeline[]> {
  return getJson(`/api/status${qs({ range, serial })}`, signal);
}

export function sortByTime<T extends { time: number }>(points: T[]): T[] {
  return [...points].sort((a, b) => a.time - b.time);
}
