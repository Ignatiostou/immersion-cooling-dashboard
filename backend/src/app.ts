import express, { Express } from "express";
import { getTanks } from "./influx/serials";
import { historyRouter } from "./routes/history";
import { errorHandler } from "./routes/http";
import { snapshotRouter } from "./routes/snapshot";
import { statusRouter } from "./routes/status";

export function createApp(): Express {
  const app = express();

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/tanks", (_req, res) => res.json({ tanks: getTanks() }));
  app.use("/api", snapshotRouter, historyRouter, statusRouter);
  app.use(errorHandler);

  return app;
}
