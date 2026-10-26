import http from "http";
import { createApp } from "./app";
import { assertConfig, PORT } from "./config";
import { refreshSerials, startSerialDiscovery } from "./influx/serials";
import { attachWebSocket } from "./ws/hub";
import { startPolling } from "./ws/poller";

async function main(): Promise<void> {

  assertConfig();

  await refreshSerials();
  startSerialDiscovery();

  const server = http.createServer(createApp());
  attachWebSocket(server);
  startPolling();

  server.listen(PORT, () => {
    console.log(`Dashboard InfluxDB API listening on http://localhost:${PORT}`);
    console.log(`WebSocket stream at ws://localhost:${PORT}/ws`);
  });
}

void main();
