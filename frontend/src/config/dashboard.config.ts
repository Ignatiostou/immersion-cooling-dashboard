import type { MetricKey, Snapshot } from "../types";
import { COLORS } from "../theme";
import type { ChartSeriesSpec } from "../charts/types";


export const COOLANT_SETPOINT = 34;
export const ALWAYS_SHOWN_METRICS = ["heatDissipation"];


export interface GaugePanelSpec {
  title: string;
  unit: string;
  color: string;
  gaugeMin: number;
  gaugeMax: number;
  key: keyof Snapshot;
  metricKey: MetricKey;
  decimals: number;
}

export const COOLANT_GAUGES: GaugePanelSpec[] = [
  { title: "Coolant Input", unit: "°C", color: COLORS.teal, gaugeMin: 0, gaugeMax: 50, key: "coolantInput", metricKey: "coolantInput", decimals: 1 },
  { title: "Coolant Output", unit: "°C", color: COLORS.orange, gaugeMin: 0, gaugeMax: 50, key: "coolantOutput", metricKey: "coolantOutput", decimals: 1 },
  { title: "Coolant Flow", unit: "m³/h", color: COLORS.green, gaugeMin: 0, gaugeMax: 12, key: "coolantFlow", metricKey: "coolantFlow", decimals: 2 },
];

export const WATER_GAUGES: GaugePanelSpec[] = [
  { title: "Water Input", unit: "°C", color: COLORS.purple, gaugeMin: 0, gaugeMax: 50, key: "waterInput", metricKey: "waterInput", decimals: 1 },
  { title: "Water Output", unit: "°C", color: COLORS.teal, gaugeMin: 0, gaugeMax: 50, key: "waterOutput", metricKey: "waterOutput", decimals: 1 },
  { title: "Water Flow", unit: "m³/h", color: COLORS.blue, gaugeMin: 0, gaugeMax: 10, key: "waterFlow", metricKey: "waterFlow", decimals: 2 },
];


export const COOLANT_TEMP_SERIES: ChartSeriesSpec[] = [
  { label: "Coolant In", metric: "coolantInput", color: COLORS.green, tickKey: "coolantInput", limits: { min: 0, max: 50 } },
  { label: "Coolant Out", metric: "coolantOutput", color: COLORS.yellow, tickKey: "coolantOutput", limits: { min: 0, max: 50 } },
];

export const COOLANT_FLOW_SERIES: ChartSeriesSpec[] = [
  { label: "coolant_flow", metric: "coolantFlow", color: COLORS.green, area: true, limits: { min: 0, max: 12 } },
];

export const WATER_TEMP_SERIES: ChartSeriesSpec[] = [
  { label: "water_input", metric: "waterInput", color: COLORS.purple, area: true, limits: { min: 0, max: 50 } },
  { label: "water_output", metric: "waterOutput", color: COLORS.teal, area: true, limits: { min: 0, max: 50 } },
];

export const WATER_FLOW_SERIES: ChartSeriesSpec[] = [
  { label: "water_flow", metric: "waterFlow", color: COLORS.blue, area: true, limits: { min: 0, max: 10 } },
];

export const HEAT_SERIES: ChartSeriesSpec[] = [
  { label: "Coolant Heat Dissipation", metric: "heatDissipation", color: COLORS.orange, tickKey: "heatDissipation", area: true, limits: { min: 0, max: 14 } },

  { label: "ΔTc", metric: "deltaTc", color: COLORS.amber, tickKey: "deltaTc", unit: "°C", rightAxis: true },
];

export const HEAT_GAUGE_PANEL: GaugePanelSpec = { title: "Coolant Dissipation", unit: "kW", color: COLORS.orange, gaugeMin: 0, gaugeMax: 14, key: "heatDissipation", metricKey: "heatDissipation", decimals: 2 };


export const ALL_CHART_SERIES: ChartSeriesSpec[] = [
  ...COOLANT_TEMP_SERIES,
  ...COOLANT_FLOW_SERIES,
  ...WATER_TEMP_SERIES,
  ...WATER_FLOW_SERIES,
  ...HEAT_SERIES,
];


export const tankHasMetric = (metrics: readonly string[], metric?: string): boolean =>
  !!metric && (metrics.includes(metric) || ALWAYS_SHOWN_METRICS.includes(metric));
