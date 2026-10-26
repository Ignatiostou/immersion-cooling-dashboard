import type { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

let wss: WebSocketServer | null = null;

export function attachWebSocket(server: Server): void {
  const socketServer = new WebSocketServer({ server, path: "/ws" });
  wss = socketServer;
  socketServer.on("connection", (socket) => {
    console.log(`[ws] client connected (${socketServer.clients.size} total)`);
    socket.on("close", () =>
      console.log(`[ws] client disconnected (${socketServer.clients.size} total)`)
    );
  });
}

export function broadcast(payload: unknown): void {
  if (!wss) return;
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}
