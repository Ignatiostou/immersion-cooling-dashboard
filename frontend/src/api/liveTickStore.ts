import type { LiveTick } from "../types";
import { WS_URL } from "./config";

type TickListener = (tick: LiveTick) => void;


class LiveTickStore {
  private socket: WebSocket | null = null;
  private started = false;
  private connected = false;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private tickListeners = new Map<string, Set<TickListener>>();
  private connListeners = new Set<() => void>();

  private start() {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  private connect = () => {

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = ws;

    ws.onopen = () => {
      if (this.socket !== ws) return; // stale socket, ignore
      this.retries = 0;
      this.setConnected(true);
    };
    ws.onclose = () => {
      if (this.socket !== ws) return; // stale socket, ignore
      this.socket = null;
      this.setConnected(false);
      this.scheduleReconnect();
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      if (this.socket !== ws) return; // stale socket, ignore
      let tick: LiveTick;
      try {
        tick = JSON.parse(event.data) as LiveTick;
      } catch {
        return;
      }
      if (tick?.type !== "tick" || !tick.values) return;
      for (const bucket of [this.tickListeners.get(tick.serial), this.tickListeners.get("")]) {
        bucket?.forEach((l) => {
          try {
            l(tick);
          } catch {

          }
        });
      }
    };
  };

  private scheduleReconnect() {
    if (this.retryTimer) return;
    const base = Math.min(30_000, 1000 * 2 ** this.retries);
    const delay = base + Math.random() * 0.3 * base;
    this.retries += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private setConnected(next: boolean) {
    if (this.connected === next) return;
    this.connected = next;
    this.connListeners.forEach((l) => l());
  }


  subscribeTick = (listener: TickListener, serial = ""): (() => void) => {
    this.start();
    let bucket = this.tickListeners.get(serial);
    if (!bucket) {
      bucket = new Set();
      this.tickListeners.set(serial, bucket);
    }
    bucket.add(listener);
    return () => {
      bucket.delete(listener);
      if (!bucket.size) this.tickListeners.delete(serial);
    };
  };

  subscribeConnected = (listener: () => void): (() => void) => {
    this.start();
    this.connListeners.add(listener);
    return () => {
      this.connListeners.delete(listener);
    };
  };

  getConnected = (): boolean => this.connected;
}


const g = globalThis as typeof globalThis & { __liveTickStore?: LiveTickStore };
export const liveTicks = (g.__liveTickStore ??= new LiveTickStore());
export type { TickListener };
