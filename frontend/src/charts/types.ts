import type { MetricKey } from "../types";

export interface ChartSeriesSpec {
  label: string;
  color: string;
  metric?: string;
  tickKey?: MetricKey;
  area?: boolean;
  unit?: string;
  rightAxis?: boolean;
  limits?: { min: number; max: number };
}

export interface ChartGaugeSpec {
  title: string;
  min: number;
  max: number;
  color?: string;
  unit?: string;
}
