import type { EChartsType } from "echarts";
import { COLORS } from "../theme";
import type { BufferPoint } from "../lib/liveSeries";



export function paint(chart: EChartsType, buffers: readonly BufferPoint[][]): void {
  chart.setOption({ series: buffers.map((data) => ({ data })) });
}

interface SeedRender {
  buffers: readonly BufferPoint[][];
  showSymbols: boolean;
  setpoint?: number;
  resetZoom: boolean;
}

export function renderSeed(chart: EChartsType, { buffers, showSymbols, setpoint, resetZoom }: SeedRender): void {
  chart.setOption({
    ...(resetZoom ? { dataZoom: [{ start: 0, end: 100 }] } : {}),
    series: buffers.map((data, i) => ({
      data,
      showSymbol: showSymbols,
      ...(i === 0 && setpoint != null
        ? {
            markLine: {
              symbol: "none",
              silent: true,
              lineStyle: { color: COLORS.purple, type: "dashed", width: 1.5 },
              label: { formatter: "Setpoint", color: COLORS.purple, position: "insideEndTop" },
              data: [{ yAxis: setpoint }],
            },
            markArea: {
              itemStyle: { color: "rgba(192,132,252,0.08)" },
              data: [[{ yAxis: setpoint - 0.75 }, { yAxis: setpoint + 0.75 }]],
            },
          }
        : {}),
    })),
  });
  chart.resize();
}


export function bindFollow(chart: EChartsType, onFollow: (following: boolean) => void): void {
  chart.on("datazoom", () => {
    const dz = (chart.getOption() as { dataZoom?: { end?: number }[] }).dataZoom;
    const end = dz && dz.length ? dz[dz.length - 1].end ?? 100 : 100;
    onFollow(end >= 99.5);
  });
}
