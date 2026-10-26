import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getDefaultSerial, isKnownSerial } from "../influx/serials";


export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };


export function parseSerial(v: unknown): string | null {
  if (v === undefined) return getDefaultSerial();
  return isKnownSerial(v) ? v : null;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[api] request failed:", err.message);
  res.status(502).json({ error: `InfluxDB query failed: ${err.message}` });
}
