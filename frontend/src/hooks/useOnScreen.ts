import { useEffect, useState, type RefObject } from "react";


export function useOnScreen<T extends Element>(
  ref: RefObject<T | null>,
  /** Start drawing slightly before it scrolls into view. */
  rootMargin = "250px"
): boolean {
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return onScreen;
}

interface ChartHost {
  getEchartsInstance():
    | { resize(size?: { width: number; height: number }): void; isDisposed(): boolean }
    | undefined;
}

export function useChartAutoResize(
  boxRef: RefObject<Element | null>,
  chartRef: RefObject<ChartHost | null>
): void {
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      const chart = chartRef.current?.getEchartsInstance();
      if (chart && !chart.isDisposed()) chart.resize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [boxRef, chartRef]);
}
