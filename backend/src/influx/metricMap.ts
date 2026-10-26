export interface InfluxSeriesRef {
  measurement: string;
  field: string;
  tags?: Record<string, string>;
}

export const MEASUREMENT = "tank_metrics";


export const METRIC_FIELDS = {
  waterFlow: "chiller_water_flow",
  waterInput: "chiller_water_in",
  waterOutput: "chiller_water_out",
  coolantFlow: "cdu_coolant_flow",
  coolantInput: "cdu_coolant_in",
  coolantOutput: "cdu_coolant_out",
  deltaTc: null, // derived: coolantOutput - coolantInput
  heatDissipation: null,
} as const satisfies Record<string, string | null>;

export const STATUS_FIELDS = {
  pump1Running: "pump1_running",
  pump2Running: "pump2_running",
  pump1Error: "pump1_error",
  pump2Error: "pump2_error",
  coolantPointLevel: "coolant_point_level",
} as const;
export type StatusKey = keyof typeof STATUS_FIELDS;


export const COOLANT_LEVEL_OK = 1;

export const coolantLevelLabel = (v: number | undefined): "Sufficient" | "Low" =>
  v === undefined || v >= COOLANT_LEVEL_OK ? "Sufficient" : "Low";

export const GAUGE_KEYS = [
  "waterFlow",
  "waterOutput",
  "waterInput",
  "coolantFlow",
  "coolantInput",
  "coolantOutput",
] as const;


export const LIVE_KEYS = [...GAUGE_KEYS, "heatDissipation", "deltaTc"] as const;
export type LiveKey = (typeof LIVE_KEYS)[number];

export function isLiveKey(key: string): key is LiveKey {
  return (LIVE_KEYS as readonly string[]).includes(key);
}

function seriesRef(field: string, serial: string): InfluxSeriesRef {
  return {
    measurement: MEASUREMENT,
    field,
    tags: serial ? { device_serial: serial } : undefined,
  };
}

const FIELD_TO_METRIC: Record<string, string> = Object.fromEntries(
  Object.entries(METRIC_FIELDS).flatMap(([key, field]) => (field ? [[field, key]] : []))
);

/** Capability flag, not a metric: the status timeline has real data to show. */
export const STATUS_CAPABILITY = "unitStatus";

/** Which metric keys a tank can serve, given the raw fields it writes. Derived
 *  metrics are included when their inputs are present; heatDissipation has no
 *  source at all, so it never appears. */
export function metricsForFields(fields: Iterable<string>): string[] {
  const present = new Set(fields);
  const keys = new Set<string>();
  for (const field of present) {
    const key = FIELD_TO_METRIC[field];
    if (key) keys.add(key);
  }
  if (keys.has("coolantInput") && keys.has("coolantOutput")) keys.add("deltaTc");
  if (Object.values(STATUS_FIELDS).some((f) => present.has(f))) {
    keys.add(STATUS_CAPABILITY);
  }
  return [...keys];
}

export function metricRef(key: string, serial: string): InfluxSeriesRef | null {
  const field = METRIC_FIELDS[key as keyof typeof METRIC_FIELDS];
  return field ? seriesRef(field, serial) : null;
}

export function statusRefs(serial: string): Record<StatusKey, InfluxSeriesRef> {
  return Object.fromEntries(
    Object.entries(STATUS_FIELDS).map(([key, field]) => [key, seriesRef(field, serial)])
  ) as Record<StatusKey, InfluxSeriesRef>;
}
