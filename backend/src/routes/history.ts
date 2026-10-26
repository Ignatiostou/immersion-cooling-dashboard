import { Router } from "express";
import { cacheGet, cacheSet } from "../cache/redisClient";
import { historyKey, rangeCacheTtl } from "../cache/keys";
import { singleFlight } from "../cache/singleFlight";
import { buildHistory, Limits, MetricHistory, MetricSpec } from "../influx/history";
import { isLiveKey, LIVE_KEYS } from "../influx/metricMap";
import { everyToSeconds, isRange, resolveEvery } from "../ranges";
import { Range } from "../types";
import { asyncHandler, parseSerial } from "./http";

const MAX_BATCH_METRICS = LIVE_KEYS.length;

function parseLimits(minV: unknown, maxV: unknown): Limits | undefined {
  const min = typeof minV === "string" ? Number(minV) : NaN;
  const max = typeof maxV === "string" ? Number(maxV) : NaN;
  return Number.isFinite(min) && Number.isFinite(max) && min < max ? { min, max } : undefined;
}

function parseMetricSpecs(raw: unknown): { specs: MetricSpec[]; unknown: string[] } {
  const specs: MetricSpec[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  if (typeof raw !== "string") return { specs, unknown };

  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [key, minS, maxS] = trimmed.split(":");
    if (!isLiveKey(key)) {
      unknown.push(key);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    specs.push({ key, limits: parseLimits(minS, maxS) });
  }
  return { specs, unknown };
}

export const historyRouter = Router();

historyRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const serial = parseSerial(req.query.serial);
    if (serial === null) return res.status(400).json({ error: "Unknown serial" });

    const range: Range = isRange(req.query.range) ? req.query.range : "1d";
    const { specs, unknown } = parseMetricSpecs(req.query.metrics);
    if (unknown.length) {
      return res.status(400).json({ error: `Unknown metric(s): ${unknown.join(", ")}` });
    }
    if (!specs.length) {
      return res.status(400).json({
        error: "Query param 'metrics' is required, e.g. ?metrics=coolantInput:0:50,coolantOutput",
      });
    }
    if (specs.length > MAX_BATCH_METRICS) {
      return res.status(400).json({ error: `Too many metrics (max ${MAX_BATCH_METRICS})` });
    }

    const every = resolveEvery(req.query.every, range);
    const key = historyKey(serial, range, every, specs);
    const cached = await cacheGet<{ series: Record<string, MetricHistory> }>(key);
    if (cached) return res.json(cached);

    // Everyone who missed the cache together waits on one set of queries.
    const body = await singleFlight(key, async () => {
      const fresh = { series: await buildHistory(serial, specs, range, every) };
      await cacheSet(key, fresh, rangeCacheTtl(range, everyToSeconds(every)));
      return fresh;
    });
    return res.json(body);
  })
);
