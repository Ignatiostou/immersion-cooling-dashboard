import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "../config";

let client: RedisClientType | null = null;
let ready = false;
let errorLogged = false;

if (REDIS_URL) {
  client = createClient({ url: REDIS_URL });
  client.on("error", (err) => {
    ready = false;
    if (!errorLogged) {
      console.error("[redis] connection error:", (err as Error).message);
      errorLogged = true;
    }
  });
  client.on("ready", () => {
    ready = true;
    errorLogged = false;
    console.log("[redis] connected");
  });
  client.connect().catch((err) => {
    console.error("[redis] initial connect failed:", (err as Error).message);
  });
} else {
  console.warn("[redis] REDIS_URL not set, history/status caching disabled");
}


async function ensureConnected(): Promise<RedisClientType | null> {
  if (!client) return null;
  if (!client.isOpen) {
    try {
      await client.connect();
    } catch (err) {
      console.error("[redis] connect failed:", (err as Error).message);
      return null;
    }
  }
  return ready ? client : null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await ensureConnected();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.error("[redis] get failed:", (err as Error).message);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = await ensureConnected();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error("[redis] set failed:", (err as Error).message);
  }
}
