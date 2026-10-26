import {
  applyReading,
  commitInterval,
  emptyState,
  intervalEndFor,
  peakValue,
  resetStates,
  seedState,
} from "./liveSeries.ts";

let checks = 0;
function ok(condition: boolean, what: string): void {
  checks += 1;
  if (!condition) throw new Error(`FAILED: ${what}`);
}
const eq = (a: unknown, b: unknown, what: string) => ok(Object.is(a, b), `${what} (got ${String(a)}, want ${String(b)})`);
const near = (a: number | null, b: number, what: string) =>
  ok(a != null && Math.abs(a - b) < 1e-9, `${what} (got ${String(a)}, want ~${b})`);

const reading = (value: number, at: number) => ({ value, at });
const LIMITS = { min: 0, max: 50 };
const CAP = 4;

// --- a fresh sample opens an interval, the next one closes it ---------------
{
  const s = emptyState();
  eq(applyReading(s, reading(10, 1_000), 5_000, CAP), false, "first sample only opens an interval");
  eq(applyReading(s, reading(12, 6_000), 10_000, CAP), true, "next interval closes the previous one");
  eq(s.buf.length, 1, "one point drawn per closed interval");
  eq(s.buf[0][0], 5_000, "the point is stamped with the interval boundary");
  eq(s.buf[0][1], 10, "and carries the last sample of that interval");
}

// --- the same measurement polled twice is one sample, not two --------------
{
  const s = emptyState();
  applyReading(s, reading(10, 1_000), 5_000, CAP);
  eq(applyReading(s, reading(10, 1_000), 5_000, CAP), false, "a repeat is not a commit");
  applyReading(s, reading(20, 6_000), 10_000, CAP);
  const stats = s.stats.snapshot();
  eq(stats.mean, 15, "the repeat is not weighted into the mean");
  eq(stats.min, 10, "min sees each measurement once");
  eq(stats.max, 20, "max sees each measurement once");
}

// --- no fresh measurement draws a gap, and stays out of the stats ------------
{
  const s = emptyState();
  applyReading(s, reading(10, 1_000), 5_000, CAP);
  applyReading(s, null, 10_000, CAP); // stale sensor / failed poll
  applyReading(s, reading(30, 11_000), 15_000, CAP);
  ok(Number.isNaN(s.buf[1][1]), "a stale interval commits NaN, which ECharts leaves as a hole");
  eq(s.buf[1][1] === 0, false, "and never a zero");
  const stats = s.stats.snapshot();
  eq(stats.mean, 20, "the gap does not poison the mean");
  eq(stats.max, 30, "nor the extremes");
}

// --- a breach inside an interval survives to the drawn point -----------------
{
  const acc = { end: 5_000, last: 20, min: 20, max: 80 };
  eq(peakValue(acc, LIMITS), 80, "a spike over the limit replaces the interval's last value");
  eq(peakValue({ ...acc, min: -30, max: 25 }, LIMITS), -30, "so does a dip under it");
  eq(peakValue({ ...acc, min: 20, max: 25 }, LIMITS), 20, "an interval inside the limits keeps its last value");
  eq(peakValue(acc), 20, "without limits the last value always wins");
}

// --- the buffer never outgrows the range ------------------------------------
{
  const s = emptyState();
  for (let i = 1; i <= 20; i += 1) applyReading(s, reading(i, i * 1_000), i * 5_000, CAP);
  ok(s.buf.length <= CAP, "the buffer is capped to the range");
  eq(s.buf[s.buf.length - 1][1], 19, "keeping the newest points");
}

// --- a still-open interval already in the seed is overwritten, not appended --
{
  const s = seedState([{ time: 5_000, value: 7 }], null, CAP);
  s.acc = { end: 5_000, last: 9, min: 9, max: 9 };
  commitInterval(s, CAP);
  eq(s.buf.length, 1, "the seeded point for this interval is replaced, not duplicated");
  eq(s.buf[0][1], 9, "with the live value");
}

// --- seeding and resetting ---------------------------------------------------
{
  const s = seedState(
    [{ time: 3_000, value: 3 }, { time: 1_000, value: 1 }],
    { min: 1, max: 3, mean: 2, last: 3, count: 2 },
    CAP
  );
  eq(s.buf[0][0], 1_000, "seed points are sorted oldest first");
  eq(s.stats.snapshot().mean, 2, "stats are seeded from InfluxDB, not recomputed from the points");
  s.stats.push(6);
  near(s.stats.snapshot().mean, (2 * 2 + 6) / 3, "and live samples fold in on top of the seeded count");

  const [fresh] = resetStates(1);
  eq(fresh.buf.length, 0, "a reset drops the previous query's points");
  eq(fresh.stats.snapshot().mean, null, "and its stats");
  eq(fresh.lastAt, 0, "and lets the next measurement count as new");
}

// --- interval boundaries -----------------------------------------------------
{
  eq(intervalEndFor(4_999, 5_000), 5_000, "a tick belongs to the interval it closes");
  eq(intervalEndFor(5_000, 5_000), 5_000, "a tick exactly on the boundary closes that one");
  eq(intervalEndFor(5_001, 5_000), 10_000, "the next one opens after it");
}

console.log(`live-series: ${checks} checks passed`);
