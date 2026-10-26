import { InfluxDB, QueryApi } from "@influxdata/influxdb-client";
import {
  assertConfig,
  INFLUX_MAX_CONCURRENCY,
  INFLUX_ORG,
  INFLUX_TOKEN,
  INFLUX_URL,
} from "../config";

let queryApi: QueryApi | null = null;

export function getQueryApi(): QueryApi {
  if (!queryApi) {
    assertConfig();
    queryApi = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN }).getQueryApi(INFLUX_ORG);
  }
  return queryApi;
}


let active = 0;
const waiting: (() => void)[] = [];


export async function runQuery<T>(flux: string): Promise<T[]> {
  if (active >= INFLUX_MAX_CONCURRENCY) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active += 1;
  try {
    return await getQueryApi().collectRows<T>(flux);
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}
