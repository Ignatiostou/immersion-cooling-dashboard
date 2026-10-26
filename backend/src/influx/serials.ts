import { MEASUREMENT, metricsForFields } from "./metricMap";
import { queryFieldsByTag } from "./query";

const SERIAL_TAG = "device_serial";

/** How far back a tank must have written to still count as present. */
const LOOKBACK = "-30d";
const REFRESH_MS = 5 * 60 * 1000;


let serials: string[] = [""];
let metricsBySerial: Record<string, string[]> = {};

/** Returns the currently discovered tank serials. */
export const getSerials = (): string[] => serials;

/** Returns each discovered tank with its available metrics. */
export const getTanks = (): { serial: string; metrics: string[] }[] =>
  serials.map((serial) => ({ serial, metrics: metricsBySerial[serial] ?? [] }));


/** Returns the first discovered serial, or an empty string when none exist. */
export const getDefaultSerial = (): string => serials[0] ?? "";

/** Narrow unknown input before checking it against the discovered serials. */
export function isKnownSerial(v: unknown): v is string {
  return typeof v === "string" && serials.includes(v);
}

/** Returns true when the set changed, so the caller can rebuild anything keyed by it. */
async function refresh(): Promise<boolean> {
  const pairs = await queryFieldsByTag(SERIAL_TAG, MEASUREMENT, LOOKBACK);

  const fieldsBySerial = new Map<string, Set<string>>();
  for (const { value, field } of pairs) {
    const serial = value.trim();
    if (!serial) continue;
    if (!fieldsBySerial.has(serial)) fieldsBySerial.set(serial, new Set());
    fieldsBySerial.get(serial)!.add(field);
  }

  const found = [...fieldsBySerial.keys()].sort();


  if (!found.length) return false;

  const next: Record<string, string[]> = {};
  for (const [serial, fields] of fieldsBySerial) next[serial] = metricsForFields(fields).sort();

  const signature = (list: string[], map: Record<string, string[]>) =>
    list.map((s) => `${s}:${(map[s] ?? []).join("+")}`).join(",");
  const changed = signature(found, next) !== signature(serials, metricsBySerial);

  serials = found;
  metricsBySerial = next;
  if (changed) console.log(`[influx] tanks discovered: ${found.join(", ")}`);
  return changed;
}

let errorLogged = false;

/** Refreshes discovered serials and logs discovery errors once until recovery. */
export async function refreshSerials(): Promise<boolean> {
  try {
    const changed = await refresh();
    errorLogged = false;
    return changed;
  } catch (err) {
    if (!errorLogged) {
      console.error("[influx] tank discovery failed:", (err as Error).message);
      errorLogged = true;
    }
    return false;
  }
}

export function startSerialDiscovery(): void {
  setInterval(() => void refreshSerials(), REFRESH_MS);
}
