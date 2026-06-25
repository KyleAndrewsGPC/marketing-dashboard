import { rng } from "./prng.ts";
import type { ProductionLine, WorkOrder } from "./types.ts";
import { CUSTOMERS, LINE_DEFS, PROGRAMS, type LineDef } from "./content.ts";

const MIN = 60_000;

function makeOrder(seedParts: (string | number)[]): WorkOrder {
  const r = rng(...seedParts, "order");
  return {
    id: `WO-${r.int(1000, 9999)}`,
    customer: r.pick(CUSTOMERS),
    program: r.pick(PROGRAMS),
  };
}

/**
 * Build one line's live state by walking a deterministic sequence of job
 * blocks forward from the start of the production day until we reach the block
 * containing `now`. Each block is either a maintenance window or a job
 * (make-ready → run). The walk is pure in `(daySeed, lineId, now)`.
 */
function buildLine(def: LineDef, daySeed: number, dayStart: number, now: number): ProductionLine {
  const base: ProductionLine = {
    id: def.id,
    name: def.name,
    kind: def.kind,
    status: "idle",
    order: null,
    progress: 0,
    speed: 0,
    unit: def.unit,
    etaMinutes: null,
  };

  // A small chance a line is down for the whole production day.
  const dayR = rng(daySeed, def.id, "day");
  if (dayR.chance(0.06)) {
    return { ...base, status: "idle" };
  }

  let cursor = dayStart;
  // Generous cap; a day is only ~1440 minutes of blocks.
  for (let block = 0; block < 200; block++) {
    const br = rng(daySeed, def.id, block);

    // Occasional maintenance window between jobs.
    if (block > 0 && br.chance(0.12)) {
      const maintMs = br.int(20, 55) * MIN;
      if (now < cursor + maintMs) {
        return {
          ...base,
          status: "maintenance",
          etaMinutes: Math.ceil((cursor + maintMs - now) / MIN),
        };
      }
      cursor += maintMs;
      continue;
    }

    const setupMs = br.int(8, 22) * MIN;
    const runMs = br.int(35, 120) * MIN;
    const runStart = cursor + setupMs;
    const end = runStart + runMs;

    if (now < runStart) {
      // In make-ready / setup before the run begins.
      return {
        ...base,
        status: "setup",
        order: makeOrder([daySeed, def.id, block]),
        progress: 0,
        speed: 0,
        etaMinutes: Math.ceil((end - now) / MIN),
      };
    }

    if (now < end) {
      // Running. Apply a gentle live jitter to the speed so it ticks visibly.
      const [lo, hi] = def.speedRange;
      const baseSpeed = lo + br.next() * (hi - lo);
      const jitter = 1 + 0.035 * Math.sin(now / 47_000 + def.id.charCodeAt(1));
      return {
        ...base,
        status: "running",
        order: makeOrder([daySeed, def.id, block]),
        progress: (now - runStart) / runMs,
        speed: Math.round(baseSpeed * jitter),
        etaMinutes: Math.max(1, Math.ceil((end - now) / MIN)),
      };
    }

    cursor = end;
  }

  return base;
}

export function buildLines(daySeed: number, dayStart: number, now: number): ProductionLine[] {
  return LINE_DEFS.map((def) => buildLine(def, daySeed, dayStart, now));
}
