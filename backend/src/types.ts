export type Range = "5m" | "15m" | "30m" | "1h" | "6h" | "1d" | "7d" | "30d";

export interface Point {
  time: number; //ms
  value: number;
}

/** A single measurement, carrying the time InfluxDB recorded it — which is not
 *  the time it reached the dashboard. Without `at` there is no way to tell a
 *  live sensor from one that stopped writing but still answers `last()`. */
export interface Reading {
  value: number;
  /** Measurement timestamp (ms). */
  at: number;
}


export interface Stats {
  min: number | null;
  max: number | null;
  mean: number | null;
  last: number | null;
  count: number;
}



export type CompressorState = "Stand By" | "Compressor On";
export type OnOff = "On" | "Off";

export interface StatusSegment {
  start: number;
  end: number;
  state: string;
}

export interface StatusTimeline {
  signal: string;
  segments: StatusSegment[];
}


export interface LiveTick {
  type: "tick";
  /** Tank this tick belongs to; "" when no device_serial filter is configured. */
  serial: string;
  timestamp: number;

  values: {
    waterFlow: Reading | null;
    waterOutput: Reading | null;
    waterInput: Reading | null;
    coolantFlow: Reading | null;
    coolantInput: Reading | null;
    coolantOutput: Reading | null;
    heatDissipation: Reading | null;
    deltaTc: Reading | null;
  };
  status: {
    globalAlarm: OnOff | "False" | "True";
    pumpAlarm: "False" | "True";
    unitStatus: CompressorState;
    compressorStatus: OnOff;
    condenserFans: OnOff;
    pump1Status: OnOff;
    pump2Status: OnOff;
    pump1Mode: "Auto" | "Manual";
    pump2Mode: "Auto" | "Manual";
    coolantPointLevel: "Sufficient" | "Low";
  };
}
