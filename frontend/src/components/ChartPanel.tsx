import { useMemo, useRef, useState } from "react";
import echarts, { EChartsView as ReactECharts } from "../charts/echarts";
import { COLORS, uiClass } from "../theme";
import Panel from "./Panel";
import Gauge, { type GaugeHandle } from "./Gauge";
import StatsLegend, { type StatsLegendHandle, type StatsLegendRow } from "./StatsLegend";
import { buildLineOption } from "../charts/line";
import { useLiveSeries } from "../hooks/useLiveSeries";
import { useChartAutoResize, useOnScreen } from "../hooks/useOnScreen";
import { useRange } from "../context/RangeContext";
import type { ChartGaugeSpec, ChartSeriesSpec } from "../charts/types";


export type { ChartSeriesSpec } from "../charts/types";

interface ChartPanelProps {
  title: string;
  unit: string;
  secondaryUnit?: string;
  series: ChartSeriesSpec[];
  height?: number;
  yScale?: boolean;
  accent?: string;
  glow?: string;
  gauge?: ChartGaugeSpec;
  setpointRow?: string;
  /** Static setpoint (°C); draws the dashed markLine + tolerance band. */
  setpoint?: number;
}


export default function ChartPanel({
  title,
  unit,
  secondaryUnit,
  series,
  height = 260,
  yScale = false,
  accent,
  glow,
  gauge,
  setpointRow,
  setpoint,
}: ChartPanelProps) {
  const { range } = useRange();

  const chartRef = useRef<ReactECharts>(null);
  const gaugeRef = useRef<GaugeHandle>(null);
  const legendRef = useRef<StatsLegendHandle>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(boxRef);
  useChartAutoResize(boxRef, chartRef);

  const accentColor = accent ?? series[0]?.color ?? COLORS.teal;
  const [hiddenLabels, setHiddenLabels] = useState<ReadonlySet<string>>(new Set());

  const toggleSeries = (label: string) => {
    chartRef.current?.getEchartsInstance()?.dispatchAction({ type: "legendToggleSelect", name: label });
    setHiddenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const legendRows = useMemo<StatsLegendRow[]>(() => {
    const rows: StatsLegendRow[] = series.map((s) => ({
      label: s.label,
      color: s.color,
      unit: s.unit,
    }));
    if (setpointRow) rows.push({ label: setpointRow, color: COLORS.purple, dashed: true });
    return rows;
  }, [series, setpointRow]);

  const option = useMemo(
    () => buildLineOption({ series, unit, secondaryUnit, yScale }),
    [series, unit, secondaryUnit, yScale]
  );

  const { error } = useLiveSeries({
    series,
    range,
    setpointRow,
    setpoint,
    hasGauge: !!gauge,
    onScreen,
    chartRef,
    gaugeRef,
    legendRef,
  });

  const chartEl = (
    <ReactECharts
      echarts={echarts}
      ref={chartRef}
      option={option}
      style={{ height: "100%", width: "100%" }}
      lazyUpdate
    />
  );

  return (
    <Panel title={title} glow={glow} error={error}>
      {gauge ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "220px 1fr" }}>
          <div className="flex flex-col justify-center">
            <Gauge
              ref={gaugeRef}
              min={gauge.min}
              max={gauge.max}
              color={gauge.color ?? accentColor}
              unit={gauge.unit}
            />
            <div className={uiClass.gaugeTitle}>{gauge.title}</div>
          </div>
          <div ref={boxRef} style={{ height, minWidth: 0, width: "100%" }}>
            {chartEl}
          </div>
        </div>
      ) : (
        <div ref={boxRef} style={{ height }}>
          {chartEl}
        </div>
      )}

      <StatsLegend
        ref={legendRef}
        rows={legendRows}
        unit={unit}
        hiddenLabels={hiddenLabels}
        onToggle={toggleSeries}
      />
    </Panel>
  );
}
