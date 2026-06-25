import { rng, type Rng } from "./prng.ts";
import type { ClientJob } from "./types.ts";
import { pickClientJob } from "./content.ts";

const MIN = 60_000;

/** Fixed roster of processing lanes. Each runs a back-to-back stream of jobs. */
const LANES = ["LN1", "LN2", "LN3", "LN4", "LN5", "LN6"] as const;

/**
 * A live sub-status line for the current stage, e.g. "record 1,240 of 4,800".
 * The noun is chosen from the stage name; the count grows with stage progress.
 * Seeded deterministically so the *total* (`y`) is stable while the running
 * count (`x`) climbs as the stage proceeds.
 */
function detailFor(stage: string, r: Rng, p: number): string {
  const s = stage.toLowerCase();
  const mk = (lo: number, hi: number, fn: (x: number, y: number) => string) => {
    const y = r.int(lo, hi);
    const x = Math.max(1, Math.min(y, Math.ceil(y * p)));
    return fn(x, y);
  };
  if (/store/.test(s)) return mk(40, 640, (x, y) => `store ${x} of ${y}`);
  if (/download|loading|pulling|finding|matching|staging|master/.test(s))
    return mk(4, 60, (x, y) => `file ${x} of ${y}`);
  if (/mapping|extracting|processing|validating|price change/.test(s))
    return mk(120, 4800, (x, y) => `record ${x.toLocaleString()} of ${y.toLocaleString()}`);
  if (/batch/.test(s)) return mk(3, 24, (x, y) => `batch ${x} of ${y}`);
  if (/routing|sending/.test(s)) return mk(2, 12, (x, y) => `route ${x} of ${y}`);
  if (/report|stats/.test(s)) return mk(2, 9, (x, y) => `section ${x} of ${y}`);
  if (/generating|creating|composing|preparing|building|finishing/.test(s))
    return mk(6, 220, (x, y) => `${x} of ${y} files`);
  return mk(2, 40, (x, y) => `${x} of ${y}`);
}

/**
 * Resolve one lane's live job by walking its deterministic stream of jobs
 * forward from the start of the day until we reach the one containing `now`.
 * Each job runs its stages back-to-back, occasionally pausing for a review
 * hold. The walk is pure in `(daySeed, laneId, now)`, so it self-corrects
 * across reboots and rolls over cleanly at midnight.
 */
function buildJob(laneId: string, daySeed: number, dayStart: number, now: number): ClientJob {
  let cursor = dayStart;

  for (let block = 0; block < 400; block++) {
    const seed: (string | number)[] = [daySeed, laneId, block];
    const picked = pickClientJob(rng(...seed, "job"));
    const activeStages = picked.stages.length - 1; // exclude terminal "Finished"

    const durs: number[] = [];
    let runTotal = 0;
    for (let s = 0; s < activeStages; s++) {
      const d = rng(...seed, "dur", s).range(1.2, 7) * MIN;
      durs.push(d);
      runTotal += d;
    }

    // Occasional review hold inserted at the end of one stage.
    const hr = rng(...seed, "review");
    let holdAt = -1;
    let holdMs = 0;
    if (hr.chance(0.07)) {
      holdAt = hr.int(0, activeStages - 1);
      holdMs = hr.int(3, 9) * MIN;
    }

    const jobEnd = cursor + runTotal + holdMs;
    if (now >= jobEnd) {
      cursor = jobEnd;
      continue;
    }

    const base = {
      laneId,
      client: picked.client,
      jobLabel: picked.jobLabel,
      stages: picked.stages,
      etaMinutes: Math.max(1, Math.ceil((jobEnd - now) / MIN)),
    };
    const span = runTotal + holdMs;

    let t = cursor;
    for (let s = 0; s < activeStages; s++) {
      const stageEnd = t + durs[s];
      if (now < stageEnd) {
        const stageProgress = (now - t) / durs[s];
        return {
          ...base,
          status: "running",
          stageIndex: s,
          stageProgress,
          overallProgress: (now - cursor) / span,
          detail: detailFor(picked.stages[s], rng(...seed, "detail", s), stageProgress),
        };
      }
      if (s === holdAt) {
        const holdEnd = stageEnd + holdMs;
        if (now < holdEnd) {
          return {
            ...base,
            status: "review",
            stageIndex: s,
            stageProgress: 1,
            overallProgress: (now - cursor) / span,
            detail: `Held for review · stage ${s + 1} of ${activeStages}`,
          };
        }
        t = holdEnd;
      } else {
        t = stageEnd;
      }
    }

    cursor = jobEnd;
  }

  // Unreachable in a normal day; a quiescent fallback.
  return {
    laneId,
    client: "—",
    jobLabel: "Idle",
    stages: ["Finished"],
    stageIndex: 0,
    stageProgress: 0,
    overallProgress: 0,
    detail: "",
    status: "queued",
    etaMinutes: null,
  };
}

export function buildJobs(daySeed: number, dayStart: number, now: number): ClientJob[] {
  return LANES.map((laneId) => buildJob(laneId, daySeed, dayStart, now));
}
