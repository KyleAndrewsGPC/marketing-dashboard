import { hashSeed, rng } from "./prng.ts";
import { areaUpTo, BASE_CURVE, dayContext, shiftName, weightAt } from "./time.ts";
import { buildLines } from "./lines.ts";
import { buildFeed } from "./feed.ts";
import { DAILY_TARGETS, FIXED_SEED, PIPELINE_STAGES } from "./content.ts";
import type {
  DataPipeline,
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

/** Stage attrition through the data funnel (small losses to exceptions). */
const STAGE_FACTORS: readonly number[] = [1.0, 0.992, 0.985, 0.978, 0.97];

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

  // Instantaneous rate, units/hour, = d/dt of the cumulative curve.
  const ratePerHour = (m: MetricKey) =>
    (DAILY_TARGETS[m] * dayFactor(dayNumber, m) * weightAt(weights, hoursElapsed)) / fullArea;

  const lines = buildLines(daySeed, dayStart, now);
  const activeLines = lines.filter((l) => l.status === "running").length;

  // ---- On-time %: stable per-day baseline with a gentle live drift ----
  const onTimeBase = rng(daySeed, "ontime").range(97.2, 99.6);
  const onTimePct =
    Math.round((onTimeBase + 0.25 * Math.sin(now / 90_000)) * 10) / 10;

  const kpis: Kpis = {
    priceStrips: cumulative("priceStrips"),
    popSigns: cumulative("popSigns"),
    impressions: cumulative("impressions"),
    dataRecords: cumulative("dataRecords"),
    onTimePct,
    activeLines,
    totalLines: lines.length,
  };

  // ---- Throughput-by-hour (price strips), with projected full-day bars ----
  const stripsTarget = DAILY_TARGETS.priceStrips * dayFactor(dayNumber, "priceStrips");
  const perHourProjected = (h: number) =>
    (stripsTarget * (areaUpTo(weights, h + 1) - areaUpTo(weights, h))) / fullArea;

  const throughput: ThroughputBar[] = [];
  let throughputPeak = 0;
  const currentHour = Math.floor(hoursElapsed);
  for (let h = 0; h < 24; h++) {
    const projected = perHourProjected(h);
    throughputPeak = Math.max(throughputPeak, projected);
    const upper = Math.min(h + 1, hoursElapsed);
    const actual =
      upper > h ? (stripsTarget * (areaUpTo(weights, upper) - areaUpTo(weights, h))) / fullArea : 0;
    throughput.push({
      hour: h,
      value: Math.round(actual),
      current: h === currentHour,
      future: h > currentHour,
    });
  }

  // ---- Data pipeline funnel ----
  const recordsPerMin = ratePerHour("dataRecords") / 60;
  const exceptionRate = Math.round(rng(daySeed, "exc").range(0.4, 1.2) * 100) / 100;
  const dataCum = cumulative("dataRecords");
  const stages = PIPELINE_STAGES.map((name, i) => {
    const f = STAGE_FACTORS[i];
    const stageRate = recordsPerMin * f;
    return {
      name,
      ratePerMin: Math.round(stageRate),
      processedToday: Math.round(dataCum * f),
      // Work-in-progress ≈ a fraction of a minute of flow held in the stage.
      wip: Math.round(stageRate * rng(daySeed, "wip", i).range(0.6, 1.8)),
    };
  });
  const pipeline: DataPipeline = {
    stages,
    recordsPerMin: Math.round(recordsPerMin),
    exceptionRate,
    totalProcessedToday: dataCum,
  };

  // ---- Week-to-date ticker ----
  const ticker = buildTicker(ctx, kpis);

  return {
    now,
    shift: shiftName(new Date(now).getHours()),
    kpis,
    lines,
    throughput,
    throughputPeak,
    pipeline,
    feed: buildFeed(daySeed, now),
    ticker,
  };
}

function buildTicker(
  ctx: ReturnType<typeof dayContext>,
  todayKpis: Kpis,
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
    { label: "WTD Price Strips", value: fmt(wtd("priceStrips", todayKpis.priceStrips)) },
    { label: "WTD POP Signs", value: fmt(wtd("popSigns", todayKpis.popSigns)) },
    { label: "WTD Impressions", value: fmt(wtd("impressions", todayKpis.impressions)) },
    { label: "WTD Data Records", value: fmt(wtd("dataRecords", todayKpis.dataRecords)) },
    { label: "WTD On-Time", value: `${onTimeAvg}%` },
    { label: "Lines Online", value: `${todayKpis.activeLines}/${todayKpis.totalLines}` },
    { label: "Floor Status", value: "All systems operational" },
  ];
}
