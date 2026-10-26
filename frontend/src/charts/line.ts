import type { EChartsOption } from "echarts";
import { COLORS, darkTooltip } from "../theme";
import type { ChartSeriesSpec } from "./types";

interface TooltipParam {
  seriesName: string;
  marker: string;
  value: number | [number, number] | null;
  axisValueLabel?: string;
}

interface LineOptionArgs {
  series: ChartSeriesSpec[];
  unit: string;
  secondaryUnit?: string;
  yScale: boolean;
}


export function buildLineOption({
  series,
  unit,
  secondaryUnit,
  yScale,
}: LineOptionArgs): EChartsOption {
  return {
    backgroundColor: "transparent",

    animation: true,
    animationDuration: 300,
    animationDurationUpdate: 250,
    animationEasingUpdate: "linear",
    textStyle: { color: COLORS.subtext },
    grid: {
      left: 10,
      right: secondaryUnit ? 10 : 20,
      top: 20,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      ...darkTooltip,
      formatter: (params: unknown) => {
        const list = params as TooltipParam[];
        const rows = list
          .map((p) => {
            const raw = Array.isArray(p.value) ? p.value[1] : p.value;
            const seriesUnit = series.find((s) => s.label === p.seriesName)?.unit ?? unit;
            const text = Number.isFinite(Number(raw))
              ? `${Number(raw).toFixed(2)} ${seriesUnit}`
              : "—";
            return `<div style="display:flex;align-items:center;gap:6px;">${p.marker}<span>${p.seriesName}</span><span style="margin-left:auto;padding-left:18px;font-weight:600;">${text}</span></div>`;
          })
          .join("");
        return `<div style="margin-bottom:4px;">${list[0]?.axisValueLabel ?? ""}</div>${rows}`;
      },
    },

    legend: { show: false, data: series.map((s) => s.label) },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "#1e2733" } },
      axisLabel: {
        color: COLORS.subtext,
        formatter: {
          year: "{dd}/{MM}",
          month: "{dd}/{MM}",
          day: "{dd}/{MM}",
          hour: "{HH}:{mm}",
          minute: "{HH}:{mm}",
          second: "{HH}:{mm}:{ss}",
          millisecond: "{HH}:{mm}:{ss}",
        },
      },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: "value",
        scale: yScale,
        axisLabel: { color: COLORS.subtext, formatter: `{value} ${unit}` },
        splitLine: { lineStyle: { color: "#1a212b" } },
      },
      ...(secondaryUnit
        ? [
            {
              type: "value" as const,
              position: "right" as const,
              scale: yScale,
              axisLabel: { color: COLORS.subtext, formatter: `{value} ${secondaryUnit}` },
              splitLine: { show: false },
            },
          ]
        : []),
    ],

    dataZoom: [{ type: "inside", filterMode: "none" }],
    series: series.map((s) => ({
      name: s.label,
      type: "line" as const,
      showSymbol: false,
      symbol: "circle" as const,
      symbolSize: 4,
      itemStyle: { color: s.color },
      sampling: "lttb" as const,
      yAxisIndex: s.rightAxis && secondaryUnit ? 1 : 0,
      lineStyle: { color: s.color, width: 1.5 },
      ...(s.area ? { areaStyle: { color: `${s.color}1A` } } : {}),
      data: [] as [number, number][],
    })),
  };
}
