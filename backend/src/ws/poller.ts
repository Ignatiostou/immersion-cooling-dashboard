import { STALE_AFTER_MS, TICK_MS } from "../config";
import {
  coolantLevelLabel,
  InfluxSeriesRef,
  LIVE_KEYS,
  LiveKey,
  metricRef,
  StatusKey,
  STATUS_FIELDS,
  statusRefs,
} from "../influx/metricMap";
import { queryLastBatch } from "../influx/query";
import { getTanks } from "../influx/serials";
import { round2 } from "../stats";
import { LiveTick, Reading } from "../types";
import { broadcast } from "./hub";


const lastKnown: Record<string, Partial<Record<LiveKey, number>>> = {};
const statusLast: Record<string, Partial<Record<StatusKey, number>>> = {};

// Every tank in one batched query rather than one query per tank. Keyed by the
// serial's index, not the serial itself, so a serial containing the separator
// can't collide with another tank's metric.
const refKey = (i: number, key: string) => `${i}|${key}`;

let pollRefs: Record<string, InfluxSeriesRef> = {};
let refsBuiltFor = "\0";

/** Discovery can change the tank set at runtime, so refs are rebuilt when it does. */
function currentSerials(): string[] {
  const tanks = getTanks();
  const signature = tanks.map((t) => `${t.serial}:${t.metrics.join("+")}`).join(",");
  const serials = tanks.map((t) => t.serial);
  if (signature === refsBuiltFor) return serials;

  refsBuiltFor = signature;
  pollRefs = {};
  tanks.forEach(({ serial, metrics }, i) => {
    lastKnown[serial] ??= {};
    statusLast[serial] ??= {};
    // Skip metrics this tank does not write — most have no chiller-water fields,
    // and querying them just widens the Flux filter for nothing.
    const wanted = metrics.length ? LIVE_KEYS.filter((k) => metrics.includes(k)) : LIVE_KEYS;
    for (const key of wanted) {
      const ref = metricRef(key, serial);
      if (ref) pollRefs[refKey(i, key)] = ref;
    }
    for (const [key, ref] of Object.entries(statusRefs(serial))) {
      pollRefs[refKey(i, key)] = ref;
    }
  });
  return serials;
}


export function lastLiveValues(serial: string): Partial<Record<LiveKey, number>> {
  return lastKnown[serial] ?? {};
}

let polling = false;
let pollErrorLogged = false;


function freshValues(i: number, latest: Record<string, Reading>, now: number): LiveTick["values"] {
  const fresh = (key: string): Reading | null => {
    const reading = latest[refKey(i, key)];
    return reading && now - reading.at <= STALE_AFTER_MS ? reading : null;
  };

  const values = Object.fromEntries(
    LIVE_KEYS.map((key) => [key, fresh(key)])
  ) as LiveTick["values"];

  const { coolantInput, coolantOutput } = values;
  if (coolantInput && coolantOutput) {

    values.deltaTc = {
      value: round2(coolantOutput.value - coolantInput.value),
      at: Math.min(coolantInput.at, coolantOutput.at),
    };
  }
  return values;
}

function buildTick(serial: string, values: LiveTick["values"]): LiveTick {
  const status = statusLast[serial] ?? {};

  const onOff = (v?: number) => ((v ?? 0) > 0 ? "On" : "Off");
  const pumpAlarm =
    (status.pump1Error ?? 0) > 0 || (status.pump2Error ?? 0) > 0 ? "True" : "False";

  return {
    type: "tick",
    serial,
    timestamp: Date.now(),
    values,
    status: {
      globalAlarm: pumpAlarm,
      pumpAlarm,
      // No InfluxDB source for these yet — constants keep the panel shape.
      unitStatus: "Stand By",
      compressorStatus: "Off",
      condenserFans: "Off",
      coolantPointLevel: coolantLevelLabel(status.coolantPointLevel),
      pump1Status: onOff(status.pump1Running),
      pump2Status: onOff(status.pump2Running),
      pump1Mode: "Auto",
      pump2Mode: "Auto",
    },
  };
}

async function pollAndBroadcast(): Promise<void> {
  if (polling) return;
  polling = true;
  const serials = currentSerials();
  let latest: Record<string, Reading> = {};
  try {
    latest = await queryLastBatch(pollRefs);
    pollErrorLogged = false;
  } catch (err) {
    if (!pollErrorLogged) {
      console.error("[influx] live poll failed:", (err as Error).message);
      pollErrorLogged = true; // one line per outage, not one per tick
    }
  } finally {
    polling = false;
  }


  const now = Date.now();
  serials.forEach((serial, i) => {
    const values = freshValues(i, latest, now);
    const known = lastKnown[serial];
    for (const key of LIVE_KEYS) {
      const reading = values[key];
      if (reading) known[key] = reading.value;
    }
    const status = statusLast[serial];
    for (const key of Object.keys(STATUS_FIELDS) as StatusKey[]) {
      const reading = latest[refKey(i, key)];
      if (reading) status[key] = reading.value;
    }
    broadcast(buildTick(serial, values));
  });
}


export function startPolling(): void {

  const unmapped = LIVE_KEYS.filter((key) => key !== "deltaTc" && !metricRef(key, ""));
  if (unmapped.length) {
    console.warn(`[influx] metrics with no InfluxDB source yet: ${unmapped.join(", ")}`);
  }
  setInterval(pollAndBroadcast, TICK_MS);
  void pollAndBroadcast();
}
