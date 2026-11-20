import { scatter } from "./iso";

const PERIOD = 4 * 60_000;

/** A shower starts and ends at different times in each period. Using the
 * current period as the random seed keeps the sky consistent across reloads. */
export function weatherAt(time: number) {
  const period = Math.floor(time / PERIOD);
  const duration = Math.round(35_000 + scatter(period, 1) * 50_000);
  const start = period * PERIOD + Math.round(10_000 + scatter(period, 2) * (PERIOD - duration - 20_000));
  const end = start + duration;
  const rain = time >= start && time < end;
  return { rain, start, end, next: time < start ? start : rain ? end : (period + 1) * PERIOD };
}

/** The first drops gather over eight seconds. The last drizzle takes longer to clear. */
export function showerStrength(time: number, start: number, end: number) {
  const t = Math.max(0, Math.min(1, (time - start) / 8000, (end - time) / 14000));
  return t * t * (3 - 2 * t);
}
