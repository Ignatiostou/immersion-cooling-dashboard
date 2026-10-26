import { graphic } from "./echarts";
import { COLORS } from "../theme";

export const SIGNAL_ORDER = [
  "Global Alarm Status",
  "Pump Alarm Status",
  "Unit Status",
  "Compressor Status",
  "Condenser Fans Status",
  "Pump 1 Status",
  "Pump 2 Status",
  "Pump 1 Mode",
  "Pump 2 Mode",
  "Coolant Point Level",
];

export function colorForState(state: string): string {
  switch (state) {
    case "True":
    case "Low":
      return COLORS.red;
    case "Off":
      return COLORS.orange;
    case "Stand By":
      return "#c9d4de";
    case "Manual":
      return COLORS.purple;
    case "False":
    case "Sufficient":
    case "On":
    case "Compressor On":
    case "Auto":
      return COLORS.blue;
    default:
      return "#64748b";
  }
}


const labelFits = (state: string, segmentWidth: number) =>
  segmentWidth >= state.length * 6.8 + 16;


export const LEGEND_ITEMS: { label: string; state: string }[] = [
  { label: "On / Auto / False / Sufficient", state: "On" },
  { label: "Off", state: "Off" },
  { label: "Stand By", state: "Stand By" },
  { label: "True / Low", state: "True" },
  { label: "Manual", state: "Manual" },
];


export function buildTimelineOption() {
  return {
    backgroundColor: "transparent",
    textStyle: { color: COLORS.subtext },
    tooltip: {
      backgroundColor: "#141b24",
      borderColor: COLORS.panelBorder,
      textStyle: { color: COLORS.text, fontSize: 12 },
      formatter: (p: { value: [number, number, number, string] }) => {
        const [signalIndex, , , state] = p.value;
        const color = colorForState(state);
        return (
          `<div style="color:#8b98a5;">${SIGNAL_ORDER[signalIndex]}</div>` +
          `<div style="display:flex;align-items:center;gap:6px;margin-top:2px;">` +
          `<span style="width:8px;height:8px;border-radius:9999px;background:${color};"></span>` +
          `<b>${state}</b></div>`
        );
      },
    },
    grid: { left: 150, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: "time",
      axisLine: { show: false },
      axisTick: { show: false },
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
    yAxis: {
      type: "category",
      data: SIGNAL_ORDER,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#cdd6df", fontSize: 12 },
    },
    series: [
      {
        type: "custom",
        dimensions: ["category", "start", "end", "state"],
        renderItem: (
          params: { coordSys: { x: number; y: number; width: number; height: number } },
          api: {
            value: (i: number) => number;
            coord: (p: [number, number]) => number[];
            size: (p: [number, number]) => number[];
          }
        ) => {
          const categoryIndex = api.value(0);
          const start = api.coord([api.value(1), categoryIndex]);
          const end = api.coord([api.value(2), categoryIndex]);
          const height = api.size([0, 1])[1] * 0.74;
          const rectShape = graphic.clipRectByRect(

            {
              x: start[0] + 1,
              y: start[1] - height / 2,
              width: Math.max(end[0] - start[0] - 2, 1),
              height,
            },
            {
              x: params.coordSys.x,
              y: params.coordSys.y,
              width: params.coordSys.width,
              height: params.coordSys.height,
            }
          );
          if (!rectShape) return null;

          const state = String(api.value(3));
          const color = colorForState(state);
          const children: object[] = [
            {
              type: "rect",
              shape: { ...rectShape, r: 4 },

              style:
                rectShape.width < 3
                  ? { fill: color }
                  : { fill: `${color}26`, stroke: color, lineWidth: 1 },
            },
          ];
          if (labelFits(state, rectShape.width)) {
            children.push({
              type: "text",
              silent: true,
              style: {
                x: rectShape.x + rectShape.width / 2,
                y: rectShape.y + rectShape.height / 2,
                text: state,
                align: "center",
                verticalAlign: "middle",
                fill: "#eef3f8",
                fontSize: 11,
                fontWeight: 600,
              },
            });
          }
          return { type: "group", children };
        },
        encode: { x: [1, 2], y: 0 },
        data: [] as [number, number, number, string][],
      },
    ],
  };
}
