export type Range = "5m" | "15m" | "30m" | "1h" | "6h" | "1d" | "7d" | "30d";

export interface Point {
  time: number;
  value: number;
}


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


export interface Snapshot {
  waterFlow: number | null;
  waterOutput: number | null;
  waterInput: number | null;
  coolantFlow: number | null;
  coolantInput: number | null;
  coolantOutput: number | null;
  heatDissipation: number | null;
  deltaTc: number | null;
}

export interface StatusSegment {
  start: number;
  end: number;
  state: string;
}

export interface StatusTimeline {
  signal: string;
  segments: StatusSegment[];
}

export type OnOff = "On" | "Off";

export interface LiveTick {
  type: "tick";
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
    globalAlarm: string;
    pumpAlarm: string;
    unitStatus: "Stand By" | "Compressor On";
    compressorStatus: OnOff;
    condenserFans: OnOff;
    pump1Status: OnOff;
    pump2Status: OnOff;
    pump1Mode: string;
    pump2Mode: string;
    coolantPointLevel: string;
  };
}

export type MetricKey = keyof LiveTick["values"];
