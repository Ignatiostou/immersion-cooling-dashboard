import { useEffect, useRef, useState } from "react";
import type { EChartsView as ReactECharts } from "../charts/echarts";
import { useLiveTick } from "../api";
import { useRange } from "../context/RangeContext";
import { useTank } from "../context/TankContext";
import type { MetricKey, Range } from "../types";
import { MAX_POINTS, RANGES, rangeShowsSymbols, SYMBOL_MAX_POINTS } from "../config/ranges";
import {
  applyReading,
  intervalEndFor,
  resetStates,
  seedState,
  type SeriesState,
} from "../lib/liveSeries";
import { bindFollow, paint, renderSeed } from "../charts/liveChart";
import type { ChartSeriesSpec } from "../charts/types";
import type { StatsLegendHandle, StatsLegendValues } from "../components/StatsLegend";
import type { GaugeHandle } from "../components/Gauge";


type Ref<T> = { current: T | null };

interface UseLiveSeriesArgs {
  series: ChartSeriesSpec[];
  range: Range;
  setpointRow?: string;
  /** Static setpoint (°C) drawn as markLine + tolerance band on series 0. */
  setpoint?: number;
  hasGauge: boolean;
  /** False when the panel is scrolled out of view: ticks still accumulate, but
   *  nothing is drawn until it comes back. */
  onScreen?: boolean;
  chartRef: Ref<ReactECharts>;
  gaugeRef: Ref<GaugeHandle>;
  legendRef: Ref<StatsLegendHandle>;
}

const SEED_FAILED = "Couldn't load history — showing live values only.";



export function useLiveSeries({
  series,
  range,
  setpointRow,
  setpoint,
  hasGauge,
  onScreen = true,
  chartRef,
  gaugeRef,
  legendRef,
}: UseLiveSeriesArgs): { error: string | null } {
  const [error, setError] = useState<string | null>(null);
  const { pointEveryMs } = useRange();
  // History is fetched once per tank, not once per panel,see TankProvider.
  const { serial, history, historyError, historyLoading } = useTank();

  const seededRef = useRef(false);
  const followRef = useRef(true);
  const zoomBoundRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const everyMsRef = useRef(pointEveryMs);
  everyMsRef.current = pointEveryMs;
  const statesRef = useRef<SeriesState[]>(resetStates(series.length));
  /** Which query the chart is showing, to tell a new one from a periodic
   *  refetch of the same one. */
  const seedSigRef = useRef("");
  const setpointRef = useRef<number | null>(null);
  const onScreenRef = useRef(onScreen);
  onScreenRef.current = onScreen;
  /** Ticks landed while off screen; draw once when it comes back. */
  const staleViewRef = useRef(false);

  const maxLen = () =>
    Math.min(
      MAX_POINTS,
      Math.max(2, Math.round(RANGES[rangeRef.current].durationMs / everyMsRef.current))
    );

  const writeStats = () => {
    // min/max/mean come from InfluxDB with the seed; live samples fold in on
    // top. Nothing is recomputed from the drawn points.
    const values: (StatsLegendValues | null)[] = statesRef.current.map((s) => s.stats.snapshot());
    if (setpointRow) {
      const sp = setpointRef.current;
      values.push({ min: sp, max: sp, mean: sp, last: sp });
    }
    legendRef.current?.update(values);
  };


  const readyChart = () => {
    const chart = chartRef.current?.getEchartsInstance();
    return chart && chart.getOption() ? chart : null;
  };

  const repaint = () => {
    const chart = readyChart();
    if (chart) paint(chart, statesRef.current.map((s) => s.buf));
  };

  const scheduleRepaint = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      repaint();
    });
  };

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );


  useEffect(() => {
    if (!onScreen) return;
    readyChart()?.resize();
    if (!staleViewRef.current) return;
    staleViewRef.current = false;
    repaint();
    writeStats();
  }, [onScreen]);


  const failSeed = () => {
    statesRef.current = resetStates(series.length);
    setpointRef.current = setpoint ?? null;
    seededRef.current = true;
    setError(SEED_FAILED);

    const frame = requestAnimationFrame(() => {
      repaint();
      writeStats();
    });
    return () => cancelAnimationFrame(frame);
  };


  useEffect(() => {

    if (historyLoading) {
      seededRef.current = false;
      return;
    }
    if (historyError) return failSeed();
    if (!history) return;


    const missing = series
      .map((s) => s.metric)
      .filter((m): m is string => !!m && !history[m]);
    if (missing.length) {
      console.error(`History response missing metric(s): ${missing.join(", ")}`);
      return failSeed();
    }

    setError(null);
    setpointRef.current = setpoint ?? null;

    const cap = maxLen();
    statesRef.current = series.map((s) => {
      const metric = s.metric ? history[s.metric] : null;
      return seedState(metric?.points ?? [], metric?.stats ?? null, cap);
    });
    seededRef.current = true;

    const sig = `${serial}|${range}|${everyMsRef.current}`;
    const newQuery = seedSigRef.current !== sig;
    seedSigRef.current = sig;


    let frame = 0;
    const draw = () => {
      const chart = readyChart();

      if (!chart) {
        frame = requestAnimationFrame(draw);
        return;
      }

      renderSeed(chart, {
        buffers: statesRef.current.map((s) => s.buf),
        showSymbols: rangeShowsSymbols(range) && cap <= SYMBOL_MAX_POINTS,
        setpoint,
        resetZoom: newQuery,
      });

      if (!zoomBoundRef.current) {
        zoomBoundRef.current = true;
        bindFollow(chart, (following) => {
          if (following && !followRef.current) repaint();
          followRef.current = following;
        });
      }

      if (hasGauge) {
        const { buf, stats } = statesRef.current[0] ?? {};
        const value = stats?.snapshot().last ?? buf?.[buf.length - 1]?.[1];
        if (value != null && Number.isFinite(value)) gaugeRef.current?.setValue(value);
      }

      writeStats();
      repaint();
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [history, historyError, historyLoading, range, series, setpoint, hasGauge]);


  useLiveTick((tick) => {
    if (!seededRef.current) return;
    const intervalEnd = intervalEndFor(tick.timestamp, everyMsRef.current);
    const cap = maxLen();
    let committed = false;

    series.forEach((s, i) => {
      const key = (s.tickKey ?? s.metric) as MetricKey | undefined;
      const state = statesRef.current[i];
      if (!key || !state) return;
      if (applyReading(state, tick.values[key], intervalEnd, cap, s.limits)) committed = true;
    });

    // Off screen: the numbers are up to date, the drawing can wait.
    if (!onScreenRef.current) {
      if (committed) staleViewRef.current = true;
      return;
    }

    if (hasGauge) {
      const key = (series[0]?.tickKey ?? series[0]?.metric) as MetricKey | undefined;
      const reading = key ? tick.values[key] : null;
      if (reading) gaugeRef.current?.setValue(reading.value);
    }
    if (committed) {
      if (followRef.current) scheduleRepaint();
      writeStats();
    }
  }, serial);

  return { error };
}
