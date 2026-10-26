import { Router } from "express";
import { cacheGet, cacheSet } from "../cache/redisClient";
import { snapshotKey, SNAPSHOT_TTL } from "../cache/keys";
import { GAUGE_KEYS, InfluxSeriesRef, metricRef } from "../influx/metricMap";
import { queryLastBatch } from "../influx/query";
import { getTanks } from "../influx/serials";
import { round2 } from "../stats";
import { lastLiveValues } from "../ws/poller";
import { asyncHandler, parseSerial } from "./http";

const SNAPSHOT_KEYS = [...GAUGE_KEYS, "heatDissipation", "deltaTc"] as const;

export const snapshotRouter = Router();

snapshotRouter.get(
  "/snapshot",
  asyncHandler(async (req, res) => {
    const serial = parseSerial(req.query.serial);
    if (serial === null) return res.status(400).json({ error: "Unknown serial" });

    const key = snapshotKey(serial);
    const cached = await cacheGet<Record<string, number | null>>(key);
    if (cached) return res.json(cached);


    const live = lastLiveValues(serial);
    const tankMetrics = getTanks().find((t) => t.serial === serial)?.metrics ?? [];


    const refs: Record<string, InfluxSeriesRef> = {};
    for (const metric of SNAPSHOT_KEYS) {
      if (live[metric] !== undefined || !tankMetrics.includes(metric)) continue;
      const ref = metricRef(metric, serial);
      if (ref) refs[metric] = ref;
    }
    const fallback = Object.keys(refs).length ? await queryLastBatch(refs) : {};


    const body = Object.fromEntries(
      SNAPSHOT_KEYS.map((metric) => [metric, live[metric] ?? fallback[metric]?.value ?? null])
    ) as Record<string, number | null>;


    if (body.deltaTc === null && body.coolantInput !== null && body.coolantOutput !== null) {
      body.deltaTc = round2(body.coolantOutput - body.coolantInput);
    }

    await cacheSet(key, body, SNAPSHOT_TTL);
    return res.json(body);
  })
);
