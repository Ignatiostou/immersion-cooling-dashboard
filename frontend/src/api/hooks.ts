import { useEffect, useRef, useSyncExternalStore } from "react";
import { liveTicks, type TickListener } from "./liveTickStore";

export function useLiveTick(onTick: TickListener, serial = "", enabled = true): void {
  const ref = useRef(onTick);
  ref.current = onTick;
  useEffect(() => {
    if (!enabled) return;
    return liveTicks.subscribeTick((t) => ref.current(t), serial);
  }, [enabled, serial]);
}

export function useConnected(): boolean {
  return useSyncExternalStore(
    liveTicks.subscribeConnected,
    liveTicks.getConnected,
    () => false
  );
}
