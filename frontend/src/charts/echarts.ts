import * as echarts from "echarts/core";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { CustomChart, GaugeChart, LineChart } from "echarts/charts";
import {
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart, // the timeseries panels
  GaugeChart, // every gauge
  CustomChart, // the status timeline's segments
  GridComponent, // cartesian axes: time, value and category
  TooltipComponent,
  LegendComponent, // series show/hide via legendToggleSelect
  DataZoomInsideComponent, // scroll/pinch zoom on the timeseries
  MarkLineComponent, // coolant setpoint line
  MarkAreaComponent, // setpoint tolerance band
  CanvasRenderer,
]);

export default echarts;
export const { graphic } = echarts;


const interop = ReactEChartsCore as unknown as { default?: typeof ReactEChartsCore };
export const EChartsView = interop.default ?? ReactEChartsCore;
/** Same name in type position: what a ref to one of these holds. */
export type EChartsView = InstanceType<typeof ReactEChartsCore>;
