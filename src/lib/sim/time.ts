/**
 * Local production-day math. A "production day" runs from local midnight to
 * local midnight; cumulative counters reset at the boundary. Because every
 * derived value flows from these helpers, the board self-corrects across
 * reboots and rolls over at midnight with no persisted state.
 */

export interface DayContext {
  /** epoch ms at local midnight that began the current production day. */
  dayStart: number;
  /** Stable integer id for the day — used to seed per-day variation. */
  dayNumber: number;
  /** Fractional hours since dayStart, 0..24. */
  hoursElapsed: number;
  /** 0 = Sunday … 6 = Saturday (local). */
  weekday: number;
  /** epoch ms at the local midnight that began the current week (Monday). */
  weekStart: number;
}

export function dayContext(now: number): DayContext {
  const d = new Date(now);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const hoursElapsed = (now - dayStart) / 3_600_000;
  const dayNumber = Math.round(dayStart / 86_400_000);

  // Week starts Monday. JS getDay(): 0=Sun..6=Sat → days since Monday.
  const weekday = d.getDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStart = dayStart - daysSinceMonday * 86_400_000;

  return { dayStart, dayNumber, hoursElapsed, weekday, weekStart };
}

/** Three-shift operation. Returns the label for the given local hour. */
export function shiftName(hour: number): string {
  if (hour >= 6 && hour < 14) return "Shift A · Day";
  if (hour >= 14 && hour < 22) return "Shift B · Swing";
  return "Shift C · Night";
}

/**
 * Base diurnal throughput weights, one per hour (0..23). A commercial print
 * floor: low overnight, morning ramp, a lunch dip, a strong afternoon peak,
 * tapering into the evening. Per-day jitter is applied on top of this.
 */
export const BASE_CURVE: readonly number[] = [
  0.22, 0.18, 0.15, 0.14, 0.16, 0.28, // 00–05
  0.5, 0.74, 0.9, 0.97, 1.0, 0.92, // 06–11
  0.7, 0.86, 0.98, 1.0, 0.93, 0.8, // 12–17
  0.62, 0.5, 0.42, 0.36, 0.3, 0.25, // 18–23
];

/** Cosine interpolation between two values. */
function cosLerp(a: number, b: number, t: number): number {
  const f = (1 - Math.cos(t * Math.PI)) / 2;
  return a * (1 - f) + b * f;
}

/** Smoothly-interpolated curve weight at a fractional hour (0..24). */
export function weightAt(weights: readonly number[], hour: number): number {
  const h = Math.max(0, Math.min(23.9999, hour));
  const i = Math.floor(h);
  const frac = h - i;
  const a = weights[i];
  const b = weights[(i + 1) % 24];
  return cosLerp(a, b, frac);
}

/** Numerically integrate the curve from 0 to `hour` (in hour-units of area). */
export function areaUpTo(weights: readonly number[], hour: number): number {
  const step = 0.1; // 6-minute resolution — plenty smooth, still cheap
  let area = 0;
  for (let h = 0; h < hour; h += step) {
    const dh = Math.min(step, hour - h);
    area += weightAt(weights, h + dh / 2) * dh;
  }
  return area;
}
