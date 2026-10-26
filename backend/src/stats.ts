import { Point, Stats } from "./types";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Fallback for series InfluxDB can't aggregate for us: derived metrics like
 *  deltaTc, which exist only after the points are subtracted here. */
export function computeStats(points: Point[]): Stats {
  if (points.length === 0) return { min: null, max: null, mean: null, last: null, count: 0 };
  let min = Infinity,
    max = -Infinity,
    sum = 0;
  for (const p of points) {
    if (p.value < min) min = p.value;
    if (p.value > max) max = p.value;
    sum += p.value;
  }
  return {
    min: round2(min),
    max: round2(max),
    mean: round2(sum / points.length),
    last: round2(points[points.length - 1].value),
    count: points.length,
  };
}
