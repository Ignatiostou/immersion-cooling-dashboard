# Immersion Cooling Dashboard

A real-time monitoring dashboard for immersion cooling systems, built with React, TypeScript, and Apache ECharts. An Express API reads telemetry from InfluxDB and streams live updates over WebSockets.

## Features

- Coolant and water temperature and flow gauges.
- Historical charts with selectable time ranges and point intervals.
- Derived coolant temperature difference and heat dissipation metrics.
- Pump, alarm, and coolant level status timelines.
- Automatic discovery of tanks and their available metrics.
- Redis caching and shared backend polling across connected browsers.
- Responsive dark interface and Docker Compose deployment.

## Architecture

```text
InfluxDB 2.x --> Express API <--> Redis
                    |
              REST + WebSocket
                    |
           React + Apache ECharts
```

REST seeds historical charts. The backend polls current readings approximately every two seconds and broadcasts updates. Live chart updates use ECharts directly to avoid a React render for each tick. Traefik routes HTTPS requests to the API and nginx frontend.

## Stack

| Component | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, ECharts 6, Tailwind CSS 4, Vite |
| Backend | Node.js, Express 4, TypeScript, ws |
| Storage | InfluxDB 2.x |
| Cache | Redis 7 |
| Deployment | Docker Compose, nginx, Traefik 3 |

## Configuration

Copy `.env.example` to `.env` at the repository root and supply credentials for **your own** InfluxDB instance. The repository contains no telemetry dataset or working credentials. It requires a compatible data source; it does not include a simulated-data mode.

The default measurement is `tank_metrics`, with tanks identified by the `device_serial` tag. Metric and status field mappings are in `backend/src/influx/metricMap.ts`; adapt these to your own schema. Tank discovery looks back 30 days and refreshes every five minutes.

| Variable | Purpose |
| --- | --- |
| `INFLUX_URL` | InfluxDB server URL |
| `INFLUX_ORG` | Organization name or ID |
| `INFLUX_BUCKET` | Telemetry bucket |
| `INFLUX_TOKEN` | Token with read access to that bucket |
| `REDIS_URL` | Optional Redis connection URL for local development |
| `PORT` | Backend port; defaults to `4000` |
| `TICK_MS` | Live polling interval; defaults to `2000` |
| `STALE_AFTER_MS` | Stale reading threshold; defaults to `60000` |
| `INFLUX_MAX_CONCURRENCY` | Query concurrency limit; defaults to `6` |

Keep `.env`, certificates, database exports, and real device identifiers out of Git.

## Local development

Use Node.js 22.12 or later and npm. Start the backend and frontend in separate terminals:

```bash
cd backend
npm ci
npm run dev
```

```bash
cd frontend
npm ci
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`. The development proxy forwards `/api` and `/ws` to the backend on port 4000. InfluxDB must already be running and configured; Redis is optional locally.

## Docker deployment

Docker Compose includes the frontend, backend, Redis, and Traefik. InfluxDB is external: set `INFLUX_URL` to an address reachable from the backend container. `localhost` inside a container refers to that container.

The included TLS configuration expects `traefik/certs/localhost.crt` and `traefik/certs/localhost.key`. For local use, generate a self-signed certificate with OpenSSL:

```bash
mkdir -p traefik/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout traefik/certs/localhost.key -out traefik/certs/localhost.crt -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
docker compose up -d --build
```

Open `https://localhost`; a self-signed certificate requires a browser trust exception. Configure trusted certificates and authentication before exposing a deployment publicly. The application does not provide user authentication.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Process health |
| `GET /api/tanks` | Discovered tanks and metric capabilities |
| `GET /api/snapshot?serial=...` | Latest readings |
| `GET /api/history?metrics=coolantInput,coolantOutput&range=1d&serial=...` | Historical series |
| `GET /api/status?range=1d&serial=...` | Status timelines |
| `WS /ws` | Live telemetry updates |

Serial values must match discovered tanks. Supported ranges and intervals are defined in `backend/src/ranges.ts` and `frontend/src/config/ranges.ts`.

## Project structure

```text
backend/src/
  influx/       Query building, metric mappings, history, discovery, status
  routes/       REST endpoints and request validation
  cache/        Redis caching and request deduplication
  ws/           WebSocket hub and shared polling
frontend/src/
  api/          REST client and live tick subscriptions
  charts/       ECharts option builders and live updates
  components/   Dashboard panels and controls
  config/       Panels, metrics, ranges, and refresh intervals
  context/      Selected tanks and time range
traefik/        Routing and TLS configuration
```

## Verification

```bash
cd backend
npm run build
```

```bash
cd frontend
npm run lint
npm run build
npm run test
```

The frontend test command runs focused live-series checks; there is no comprehensive integration test suite.

## Publication privacy

This distribution contains application source and generic configuration templates. Operational environment files, company telemetry, logs, screenshots, certificates, local tooling configuration, and previous Git history are excluded. Connect only a data source you are authorized to use.
