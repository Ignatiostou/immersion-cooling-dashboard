import { Router } from "express";
import { buildStatusTimelines } from "../influx/status";
import { isRange } from "../ranges";
import { Range } from "../types";
import { asyncHandler, parseSerial } from "./http";

export const statusRouter = Router();

statusRouter.get(
  "/status",
  asyncHandler(async (req, res) => {
    const serial = parseSerial(req.query.serial);
    if (serial === null) return res.status(400).json({ error: "Unknown serial" });

    const range: Range = isRange(req.query.range) ? req.query.range : "1d";
    return res.json(await buildStatusTimelines(serial, range));
  })
);
