import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchHistoryBatch, fetchSnapshot, type HistoryReq, type MetricHistory } from "../api";
import type { Snapshot } from "../types";
import { ALL_CHART_SERIES, tankHasMetric } from "../config/dashboard.config";
import { useRange } from "./RangeContext";

interface TankContextValue {

  serial: string;
  metrics: string[];
  history: Record<string, MetricHistory> | null;
  historyError: boolean;
  historyLoading: boolean;
  snapshot: Snapshot | null;
  snapshotError: string | null;
}

const TankContext = createContext<TankContextValue | null>(null);


function historyReqs(metrics: string[]): HistoryReq[] {
  const seen = new Set<string>();
  const reqs: HistoryReq[] = [];
  for (const s of ALL_CHART_SERIES) {
    if (!s.metric || seen.has(s.metric) || !tankHasMetric(metrics, s.metric)) continue;
    seen.add(s.metric);
    reqs.push({ metric: s.metric, limits: s.limits });
  }
  return reqs;
}

export function TankProvider({
  serial,
  metrics,
  children,
}: {
  serial: string;
  metrics: string[];
  children: ReactNode;
}) {
  const { range, pointEvery, refreshToken, tanksLoaded } = useRange();
  const [history, setHistory] = useState<Record<string, MetricHistory> | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const reqs = useMemo(() => historyReqs(metrics), [metrics]);

  useEffect(() => {
    if (!tanksLoaded) return;
    const controller = new AbortController();
    let cancelled = false;
    setHistoryLoading(true);

    fetchHistoryBatch(reqs, range, serial, pointEvery, controller.signal)
      .then((byMetric) => {
        if (cancelled) return;
        setHistory(byMetric);
        setHistoryError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHistory(null);
        setHistoryError(true);
      })
      .finally(() => !cancelled && setHistoryLoading(false));

    return () => {
      cancelled = true;
      controller.abort();
    };

  }, [serial, range, pointEvery, refreshToken, tanksLoaded, reqs]);

  useEffect(() => {
    if (!tanksLoaded) return;
    const controller = new AbortController();
    let cancelled = false;

    fetchSnapshot(serial, controller.signal)
      .then((s) => {
        if (cancelled) return;
        setSnapshot(s);

        setSnapshotError(null);
      })
      .catch((e) => {
        if (cancelled) return; // aborted: superseded by a newer fetch, not a failure
        setSnapshotError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [serial, refreshToken, tanksLoaded]);

  const value = useMemo(
    () => ({
      serial,
      metrics,
      history,
      historyError,
      historyLoading,
      snapshot,
      snapshotError,
    }),
    [serial, metrics, history, historyError, historyLoading, snapshot, snapshotError]
  );

  return <TankContext.Provider value={value}>{children}</TankContext.Provider>;
}

export function useTank(): TankContextValue {
  const ctx = useContext(TankContext);
  if (!ctx) throw new Error("useTank must be used inside <TankProvider>");
  return ctx;
}
