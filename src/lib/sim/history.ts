/**
 * Week-over-week production history for the last ~3 months — the data behind
 * the "Output History" area chart. Management asked for a historical view, so
 * this is a separate, slower-moving series from the live intra-day metrics.
 *
 * Seeded by absolute week number so the whole window is stable through the day
 * and only advances by one point when a new week begins — no short visible
 * loop on the kiosk. Each series wobbles gently around a steady base; ESLs
 * carry a faint upward drift to hint at the line the business is growing into.
 */

import { rng } from "./prng.ts";
import { DAILY_TARGETS, FIXED_SEED } from "./content.ts";

const WEEKS = 13; // ~3 months, one point per week
const WORK_DAYS = 6; // effective production days per week
const MS_PER_WEEK = 604_800_000;

export interface HistorySeries {
  key: "signs" | "strips" | "esls";
  label: string;
  /** Design-token color name (accent | brand | running). */
  color: "accent" | "brand" | "running";
  /** Weekly totals, oldest → newest. */
  values: number[];
  /** Most recent week's value (convenience for the legend). */
  latest: number;
}

export interface History {
  weeks: number;
  /** Week-start labels oldest → newest, e.g. "Mar 31". */
  labels: string[];
  series: HistorySeries[];
}

const SERIES_DEF = [
  { key: "signs", label: "Signs", color: "accent", base: DAILY_TARGETS.signs * WORK_DAYS, drift: 0 },
  { key: "strips", label: "Strips", color: "brand", base: DAILY_TARGETS.strips * WORK_DAYS, drift: 0 },
  { key: "esls", label: "ESLs", color: "running", base: DAILY_TARGETS.esls * WORK_DAYS, drift: 0.1 },
] as const;

function monthDay(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildHistory(weekStart: number): History {
  const baseWeek = Math.round(weekStart / MS_PER_WEEK);

  const labels: string[] = [];
  for (let i = 0; i < WEEKS; i++) {
    labels.push(monthDay(weekStart - (WEEKS - 1 - i) * MS_PER_WEEK));
  }

  const series: HistorySeries[] = SERIES_DEF.map((def) => {
    const values: number[] = [];
    for (let i = 0; i < WEEKS; i++) {
      const wk = baseWeek - (WEEKS - 1 - i);
      const t = i / (WEEKS - 1); // 0..1 across the window
      const jitter = rng(FIXED_SEED, "hist", def.key, wk).range(0.94, 1.06);
      const drift = 1 + def.drift * t;
      values.push(Math.round(def.base * drift * jitter));
    }
    return {
      key: def.key,
      label: def.label,
      color: def.color,
      values,
      latest: values[values.length - 1],
    };
  });

  return { weeks: WEEKS, labels, series };
}
