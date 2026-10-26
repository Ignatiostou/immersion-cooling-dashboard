import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

function envNumber(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw && Number.isFinite(n) ? n : fallback;
}

export const PORT = envNumber(process.env.PORT, 4000);
export const TICK_MS = envNumber(process.env.TICK_MS, 2000);
export const STALE_AFTER_MS = envNumber(process.env.STALE_AFTER_MS, 60_000);
export const INFLUX_MAX_CONCURRENCY = envNumber(process.env.INFLUX_MAX_CONCURRENCY, 6);
export const INFLUX_URL = process.env.INFLUX_URL ?? "";
export const INFLUX_ORG = process.env.INFLUX_ORG ?? "";
export const INFLUX_BUCKET = process.env.INFLUX_BUCKET ?? "";
export const INFLUX_TOKEN = process.env.INFLUX_TOKEN ?? "";
export const REDIS_URL = process.env.REDIS_URL;




export function assertConfig(): void {
  const missing = Object.entries({
    INFLUX_URL,
    INFLUX_ORG,
    INFLUX_BUCKET,
    INFLUX_TOKEN,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `Missing InfluxDB settings: ${missing.join(", ")}. ` +
        `Set them in the repo-root .env (see .env.example) or in the container environment.`
    );
  }
}
