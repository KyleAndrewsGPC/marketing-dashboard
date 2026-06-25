import { rng } from "./prng.ts";
import { SIGN_SIZES } from "./content.ts";
import type { SignCount } from "./types.ts";

/**
 * Cumulative sign counts by size code for the current day. Each code climbs
 * toward its (day-jittered) daily target along the shared diurnal curve via
 * `areaFrac`, so the panel ticks up through the day and resets at midnight.
 * `daySeed` already encodes the day, so per-day variation falls out for free.
 * Pure in `(daySeed, areaFrac)`.
 */
export function buildSignCount(daySeed: number, areaFrac: number): SignCount {
  let total = 0;
  const rows = SIGN_SIZES.map((s) => {
    const jitter = rng(daySeed, "sign", s.code).range(0.85, 1.15);
    const count = Math.round(s.daily * jitter * areaFrac);
    total += count;
    // Counts only accumulate through the day, so the trend is up while there's
    // still meaningful flow; it reads flat once the curve has nearly closed out.
    return { code: s.code, count, trend: areaFrac < 0.995 ? ("up" as const) : ("flat" as const) };
  });
  return { rows, total };
}
