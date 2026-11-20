import { scatter } from "./iso";

const PERIOD = 4 * 60_000;

/** A shower starts and ends at different times in each period. Using the
 * current period as the random seed keeps the sky consistent across reloads. */
export function weatherAt(time: number) {
  const period = Math.floor(time / PERIOD);
  const duration = Math.round(35_000 + scatter(period, 1) * 50_000);
  const start = period * PERIOD + Math.round(10_000 + scatter(period, 2) * (PERIOD - duration - 20_000));
  const end = start + duration;
  if (time < start) return { rain: false, next: start };
  if (time < end) return { rain: true, next: end };
  return { rain: false, next: (period + 1) * PERIOD };
}
