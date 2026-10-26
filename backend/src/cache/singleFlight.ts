const inFlight = new Map<string, Promise<unknown>>();


export function singleFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const started = work().finally(() => inFlight.delete(key));
  inFlight.set(key, started);
  return started;
}
