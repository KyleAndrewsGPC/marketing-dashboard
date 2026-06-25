import { hashSeed, rng } from "./prng.ts";
import { areaUpTo, BASE_CURVE, dayContext, shiftName } from "./time.ts";
import { buildJobs } from "./jobs.ts";
import { buildSignCount } from "./signcount.ts";
import { buildFeed } from "./feed.ts";
import { DAILY_TARGETS, FIXED_SEED } from "./content.ts";
import type {
  ClientJob,
  FloorStatus,
  Kpis,
  Snapshot,
  ThroughputBar,
  TickerStat,
} from "./types.ts";

export type { Snapshot } from "./types.ts";

type MetricKey = keyof typeof DAILY_TARGETS;

/** Per-day multiplier (~0.88..1.12) so each day differs but is repeatable. */
function dayFactor(dayNumber: number, metric: string): number {
  return rng(FIXED_SEED, dayNumber, metric).range(0.88, 1.12);
}

/** Day-jittered diurnal curve: each hour weight nudged ±12%. */
function dayWeights(dayNumber: number): number[] {
  const r = rng(FIXED_SEED, dayNumber, "curve");
  return BASE_CURVE.map((w) => w * r.range(0.88, 1.12));
}

export function snapshot(now: number): Snapshot {
  const ctx = dayContext(now);
  const { dayNumber, dayStart, hoursElapsed } = ctx;
  const daySeed = hashSeed(FIXED_SEED, dayNumber);

  const weights = dayWeights(dayNumber);
  const fullArea = areaUpTo(weights, 24);
  const areaNow = areaUpTo(weights, hoursElapsed);
  const areaFrac = areaNow / fullArea;

  // ---- Cumulative volume metrics (share the diurnal shape) ----
  const cumulative = (m: MetricKey) =>
    Math.round(DAILY_TARGETS[m] * dayFactor(dayNumber, m) * areaFrac);

  // ---- Sign Count panel (authoritative source for "signs today") ----
  const signCount = buildSignCount(daySeed, areaFrac);

  // ---- Active client jobs across the processing lanes ----
  const jobs = buildJobs(daySeed, dayStart, now);
  const activeJobs = jobs.filter((j) => j.status === "running").length;

  // ---- On-time %: stable per-day baseline with a gentle live drift ----
  const onTimeBase = rng(daySeed, "ontime").range(97.2, 99.6);
  const onTimePct = Math.round((onTimeBase + 0.25 * Math.sin(now / 90_000)) * 10) / 10;

  const kpis: Kpis = {
    signs: signCount.total,
    printFiles: cumulative("printFiles"),
    records: cumulative("records"),
    jobsDone: cumulative("jobsDone"),
    onTimePct,
    activeJobs,
    totalLanes: jobs.length,
  };

  // ---- Throughput-by-hour (signs), with projected full-day bars ----
  const signsTarget = DAILY_TARGETS.signs * dayFactor(dayNumber, "signs");
  const perHourProjected = (h: number) =>
    (signsTarget * (areaUpTo(weights, h + 1) - areaUpTo(weights, h))) / fullArea;

  const throughput: ThroughputBar[] = [];
  let throughputPeak = 0;
  const currentHour = Math.floor(hoursElapsed);
  for (let h = 0; h < 24; h++) {
    const projected = perHourProjected(h);
    throughputPeak = Math.max(throughputPeak, projected);
    const upper = Math.min(h + 1, hoursElapsed);
    const actual =
      upper > h ? (signsTarget * (areaUpTo(weights, upper) - areaUpTo(weights, h))) / fullArea : 0;
    throughput.push({
      hour: h,
      value: Math.round(actual),
      current: h === currentHour,
      future: h > currentHour,
    });
  }

  // ---- Floor health, derived from the live job states ----
  const floorStatus = deriveFloorStatus(jobs, activeJobs);

  // ---- Week-to-date ticker ----
  const ticker = buildTicker(ctx, kpis, floorStatus);

  return {
    now,
    shift: shiftName(new Date(now).getHours()),
    kpis,
    jobs,
    throughput,
    throughputPeak,
    signCount,
    feed: buildFeed(daySeed, now),
    ticker,
    floorStatus,
  };
}

/**
 * Summarize the floor for the header pill / ticker. A job held for review
 * surfaces first; an all-quiet floor reads as idle; otherwise the board is
 * operational. Because it tracks the live job states, the headline shifts
 * naturally through the day rather than sitting on one fixed string.
 */
function deriveFloorStatus(jobs: ClientJob[], activeJobs: number): FloorStatus {
  const inReview = jobs.filter((j) => j.status === "review").length;
  if (inReview > 0) {
    return { kind: "maintenance", label: `${inReview} job${inReview > 1 ? "s" : ""} in review` };
  }
  if (activeJobs === 0) {
    return { kind: "idle", label: "Lanes idle" };
  }
  return { kind: "ok", label: "All systems operational" };
}

function buildTicker(
  ctx: ReturnType<typeof dayContext>,
  todayKpis: Kpis,
  floorStatus: FloorStatus,
): TickerStat[] {
  const { dayNumber, weekStart, dayStart } = ctx;

  // Sum completed prior days this week (full-day targets) + today's partial.
  const priorDays = Math.round((dayStart - weekStart) / 86_400_000);
  const wtd = (m: MetricKey, todayValue: number) => {
    let total = todayValue;
    for (let d = 1; d <= priorDays; d++) {
      const dn = dayNumber - d;
      total += DAILY_TARGETS[m] * dayFactor(dn, m);
    }
    return Math.round(total);
  };

  const fmt = (n: number) => n.toLocaleString();
  const onTimeAvg = Math.round(rng(FIXED_SEED, weekStart, "wtd-ontime").range(97.8, 99.1) * 10) / 10;

  return [
    { label: "WTD Signs", value: fmt(wtd("signs", todayKpis.signs)) },
    { label: "WTD Print Files", value: fmt(wtd("printFiles", todayKpis.printFiles)) },
    { label: "WTD Records", value: fmt(wtd("records", todayKpis.records)) },
    { label: "WTD Jobs", value: fmt(wtd("jobsDone", todayKpis.jobsDone)) },
    { label: "WTD On-Time", value: `${onTimeAvg}%` },
    { label: "Lanes Active", value: `${todayKpis.activeJobs}/${todayKpis.totalLanes}` },
    { label: "Floor Status", value: floorStatus.label },
  ];
}
