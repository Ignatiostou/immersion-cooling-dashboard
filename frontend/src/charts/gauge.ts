import type { EChartsOption } from "echarts";
import { COLORS } from "../theme";

interface GaugeOptionArgs {
  min: number;
  max: number;
  color: string;
  unit?: string;
  decimals?: number;
}


export function buildGaugeOption({
  min,
  max,
  color,
  unit,
  decimals = 2,
}: GaugeOptionArgs): EChartsOption {
  const accent = color ?? COLORS.teal;
  return {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min,
        max,
        radius: "95%",
        center: ["50%", "58%"],
        animationDurationUpdate: 900,
        animationEasingUpdate: "cubicInOut",
        progress: {
          show: true,
          width: 11,
          roundCap: true,
          itemStyle: { color: accent, shadowBlur: 12, shadowColor: `${accent}59` },
        },
        axisLine: {
          roundCap: true,
          lineStyle: { width: 11, color: [[1, "rgba(255,255,255,0.07)"]] as [number, string][] },
        },
        splitNumber: 1,
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true,
          distance: -34,
          color: "rgba(237,242,247,0.85)",
          fontSize: 11,
          fontWeight: 600,
          formatter: (val: number) => String(Number(val.toFixed(decimals))),
        },
        pointer: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "8%"],
          formatter: (val: number) => {
            const shown = Number.isFinite(val) ? val.toFixed(decimals) : "—";
            return unit ? `{v|${shown}}{u| ${unit}}` : `{v|${shown}}`;
          },
          rich: {
            v: { color: "#f7fafc", fontSize: 21, fontWeight: 700 },
            u: { color: COLORS.subtext, fontSize: 12, fontWeight: 600, padding: [7, 0, 0, 2] },
          },
        },

        data: [{ value: null as unknown as number }],
      },
    ],
  };
}
