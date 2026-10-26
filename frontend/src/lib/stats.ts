import type { Stats } from "../types";

export interface StatsSnapshot {
  min: number | null;
  max: number | null;
  mean: number | null;
  last: number | null;
}


export class RunningStats {
  private _min = Infinity;
  private _max = -Infinity;
  private _mean = 0;
  private _count = 0;
  private _last: number | null = null;


  /** Seeded with InfluxDB's own aggregation over the range (see /api/history),
   *  so live ticks extend the queried stats instead of replacing them with
   *  stats over the handful of points the chart happens to hold. */
  static fromStats(stats: Stats | null): RunningStats {
    const rs = new RunningStats();
    if (stats && stats.count > 0 && stats.min !== null && stats.max !== null) {
      rs._min = stats.min;
      rs._max = stats.max;
      rs._mean = stats.mean ?? 0;
      rs._count = stats.count;
      rs._last = stats.last;
    }
    return rs;
  }

  push(value: number): void {
    // NaN marks a missing live point (no fresh InfluxDB value) — it belongs in
    // the chart as a gap, not in the mean.
    if (!Number.isFinite(value)) return;
    if (value < this._min) this._min = value;
    if (value > this._max) this._max = value;
    this._count += 1;
    this._mean += (value - this._mean) / this._count;
    this._last = value;
  }

  snapshot(): StatsSnapshot {
    if (this._count === 0) return { min: null, max: null, mean: null, last: this._last };
    return { min: this._min, max: this._max, mean: this._mean, last: this._last };
  }
}
