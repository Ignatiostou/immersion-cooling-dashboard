import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Range } from "../types";
import { fetchTanks, type Tank } from "../api";
import { DEFAULT_RANGE, effectiveEvery, intervalFitsRange } from "../config/ranges";
import { intervalToMs, type PointInterval, type DurationToken } from "../config/refresh";

interface RangeContextValue {
  range: Range;
  setRange: (range: Range) => void;

 
  selected: string[];
  toggleSerial: (serial: string) => void;
  serials: string[];
  
  metricsFor: (serial: string) => string[];
  
  tanksLoaded: boolean;

  
  pointInterval: PointInterval | null;
  setPointInterval: (interval: PointInterval | null) => void;
  
  pointEvery: DurationToken;
  pointEveryMs: number;

  refreshToken: number;
  refresh: () => void;
}

const RangeContext = createContext<RangeContextValue | null>(null);
const SERIALS_KEY = "dashboard.serials";
const LEGACY_SERIAL_KEY = "dashboard.serial";
const NO_METRICS: string[] = [];
const UNFILTERED = [""];

function readRemembered(): string[] {
  try {
    const raw = localStorage.getItem(SERIALS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === "string");
    }
    const legacy = localStorage.getItem(LEGACY_SERIAL_KEY);
    return legacy ? [legacy] : [];
  } catch {
    return []; // private mode / blocked storage / corrupt value
  }
}


export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<Range>(DEFAULT_RANGE);
  const [pointInterval, setPointInterval] = useState<PointInterval | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selected, setSelected] = useState<string[]>(UNFILTERED);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tanksLoaded, setTanksLoaded] = useState(false);

  const serials = useMemo(() => tanks.map((t) => t.serial), [tanks]);
  const metricsFor = useCallback(
    (serial: string) => tanks.find((t) => t.serial === serial)?.metrics ?? NO_METRICS,
    [tanks]
  );

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  const persist = (next: string[]) => {
    try {
      localStorage.setItem(SERIALS_KEY, JSON.stringify(next));
    } catch {
      // private mode / blocked storage / quota exceeded
    }
  };

  
  const toggleSerial = useCallback(
    (serial: string) => {
      setSelected((cur) => {
        const has = cur.includes(serial);
        if (has && cur.length === 1) return cur;
        const next = has ? cur.filter((s) => s !== serial) : [...cur, serial];
        next.sort((a, b) => serials.indexOf(a) - serials.indexOf(b));
        persist(next);
        return next;
      });
    },
    [serials]
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetchTanks(controller.signal)
      .then((list) => {
        if (cancelled) return;
        setTanks(list);
        const known = readRemembered().filter((s) => list.some((t) => t.serial === s));
        setSelected(known.length ? known : list[0] ? [list[0].serial] : UNFILTERED);
      })
      .catch(() => {})
      .finally(() => !cancelled && setTanksLoaded(true));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);


  const setRange = useCallback((r: Range) => {
    setRangeState(r);
    setPointInterval((cur) => (cur && intervalFitsRange(cur, r) ? cur : null));
  }, []);

  const pointEvery = effectiveEvery(range, pointInterval);
  const pointEveryMs = intervalToMs(pointEvery);

  const value = useMemo(
    () => ({
      range,
      setRange,
      pointInterval,
      setPointInterval,
      pointEvery,
      pointEveryMs,
      refreshToken,
      refresh,
      selected,
      toggleSerial,
      serials,
      metricsFor,
      tanksLoaded,
    }),
    [
      range,
      setRange,
      pointInterval,
      pointEvery,
      pointEveryMs,
      refreshToken,
      refresh,
      selected,
      toggleSerial,
      serials,
      metricsFor,
      tanksLoaded,
    ]
  );
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRange(): RangeContextValue {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("useRange must be used inside <RangeProvider>");
  return ctx;
}
