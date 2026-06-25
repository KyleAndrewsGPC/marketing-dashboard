import { rng } from "./prng.ts";
import {
  CUSTOMERS,
  LINE_DEFS,
  PROGRAMS,
  PIPELINE_STAGES,
  INGEST_SOURCES,
  SUBSTRATES,
} from "./content.ts";
import type { EventKind, FeedEvent } from "./types.ts";

const SEC = 1000;

const PRESSES = ["Press 1", "Press 2", "Press 3", "Press 4"] as const;

/** Short source label for a randomly-picked line ("Press 2", "Finishing"). */
function lineSource(r: ReturnType<typeof rng>): string {
  return r.pick(LINE_DEFS).name.split(" · ")[0];
}

interface Template {
  kind: EventKind;
  /** Relative likelihood. Healthy events common; warn/maintenance occasional. */
  weight: number;
  build: (r: ReturnType<typeof rng>) => { source: string; message: string };
}

/*
 * A broad vocabulary spanning the whole workflow — intake, prepress, press,
 * finishing, dispatch, QC, data. Each template also varies internally (numbers,
 * customers, programs, presses, substrates), so the effective space of distinct
 * messages is large enough that the feed never reads as a short loop, even when
 * the board runs unattended all day. Weights keep the tone calm: mostly routine
 * "info"/"running" events, with warnings and maintenance as occasional color.
 */
const TEMPLATES: readonly Template[] = [
  // ---- Press / run lifecycle (running) ----
  {
    kind: "running",
    weight: 5,
    build: (r) => ({
      source: lineSource(r),
      message: `Run started · WO-${r.int(1000, 9999)} (${r.pick(CUSTOMERS)})`,
    }),
  },
  {
    kind: "running",
    weight: 3,
    build: (r) => ({
      source: lineSource(r),
      message: `Up to speed · ${r.pick(PROGRAMS)}`,
    }),
  },
  {
    kind: "running",
    weight: 2,
    build: (r) => ({
      source: "Proofing",
      message: `Proof approved · batch ${r.int(100, 999)}`,
    }),
  },
  {
    kind: "running",
    weight: 2,
    build: (r) => ({
      source: "Proofing",
      message: `Color OK'd · ${r.pick(CUSTOMERS)} · ΔE ${r.range(0.2, 1.6).toFixed(2)}`,
    }),
  },

  // ---- Routine throughput (info) ----
  {
    kind: "info",
    weight: 4,
    build: (r) => {
      const line = r.pick(LINE_DEFS);
      const qty = r.int(2, 18) * 1000;
      return {
        source: line.name.split(" · ")[0],
        message: `Run complete · ${qty.toLocaleString()} ${line.unit} · ${r.pick(PROGRAMS)}`,
      };
    },
  },
  {
    kind: "info",
    weight: 3,
    build: (r) => ({
      source: "Composition",
      message: `${r.int(3, 24)} layouts auto-composed · ${r.pick(CUSTOMERS)}`,
    }),
  },
  {
    kind: "info",
    weight: 3,
    build: (r) => ({
      source: "Ingest",
      message: `${r.int(2, 40)} files received · ${r.pick(INGEST_SOURCES)}`,
    }),
  },
  {
    kind: "info",
    weight: 3,
    build: (r) => ({
      source: "Ingest",
      message: `${r.pick(PROGRAMS)} imported · ${r.int(40, 1800).toLocaleString()} SKUs`,
    }),
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => ({
      source: "Release",
      message: `Batch released to ${r.pick(PRESSES)} · ${r.int(4, 40)} plates`,
    }),
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => ({
      source: "Dispatch",
      message: `Shipment staged · ${r.int(2, 24)} cartons · ${r.pick(CUSTOMERS)}`,
    }),
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => ({
      source: "Dispatch",
      message: `Pickup scheduled · ${r.int(1, 8)} skids`,
    }),
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => ({
      source: "QC",
      message: `Sample check passed · ${r.int(4, 24)} pulled · within spec`,
    }),
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => ({
      source: "Prepress",
      message: `${r.int(3, 30)} jobs nested · ${r.range(2, 12).toFixed(1)}% stock saved`,
    }),
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => ({
      source: lineSource(r),
      message: `Plates output · ${r.int(4, 32)} · ${r.pick(PRESSES)}`,
    }),
  },
  {
    kind: "info",
    weight: 1,
    build: (r) => ({
      source: r.pick(PIPELINE_STAGES),
      message: `Throughput steady · ${r.int(800, 2400)} records/min`,
    }),
  },
  {
    kind: "info",
    weight: 1,
    build: (r) => ({
      source: "Proofing",
      message: `Proof sent to client · ${r.pick(CUSTOMERS)}`,
    }),
  },
  {
    kind: "info",
    weight: 1,
    build: (r) => ({
      source: lineSource(r),
      message: `Roll change · ${r.pick(SUBSTRATES)}`,
    }),
  },

  // ---- Make-ready / setup ----
  {
    kind: "setup",
    weight: 3,
    build: (r) => ({
      source: lineSource(r),
      message: `Make-ready started · ${r.pick(PROGRAMS)}`,
    }),
  },
  {
    kind: "setup",
    weight: 1,
    build: (r) => ({
      source: lineSource(r),
      message: `Plate mount · WO-${r.int(1000, 9999)}`,
    }),
  },
  {
    kind: "setup",
    weight: 1,
    build: (r) => ({
      source: lineSource(r),
      message: `Color calibration · ${r.pick(PRESSES)}`,
    }),
  },

  // ---- Warnings (occasional, auto-resolved so the board reads healthy) ----
  {
    kind: "warn",
    weight: 1,
    build: (r) => ({
      source: "Preflight",
      message: `${r.int(1, 5)} exceptions flagged · auto-corrected`,
    }),
  },
  {
    kind: "warn",
    weight: 1,
    build: (r) => ({
      source: "Preflight",
      message: `Low-res image replaced · ${r.pick(CUSTOMERS)}`,
    }),
  },
  {
    kind: "warn",
    weight: 1,
    build: (r) => ({
      source: "Preflight",
      message: `Font substituted · ${r.int(1, 4)} files`,
    }),
  },
  {
    kind: "warn",
    weight: 1,
    build: (r) => ({
      source: lineSource(r),
      message: `Registration adjusted · ${r.pick(PRESSES)}`,
    }),
  },

  // ---- Maintenance ----
  {
    kind: "maintenance",
    weight: 1,
    build: (r) => ({
      source: lineSource(r),
      message: `Scheduled maintenance · ${r.int(20, 55)} min`,
    }),
  },
  {
    kind: "maintenance",
    weight: 1,
    build: (r) => ({
      source: lineSource(r),
      message: `Blanket wash · ${r.pick(PRESSES)}`,
    }),
  },
];

const TOTAL_WEIGHT = TEMPLATES.reduce((sum, t) => sum + t.weight, 0);

/** Weighted template pick using one draw from the bucket's PRNG. */
function pickTemplate(r: ReturnType<typeof rng>): Template {
  let x = r.next() * TOTAL_WEIGHT;
  for (const t of TEMPLATES) {
    x -= t.weight;
    if (x < 0) return t;
  }
  return TEMPLATES[TEMPLATES.length - 1];
}

/**
 * Generate the recent activity stream deterministically. We scan fixed-size
 * time buckets over a trailing window; each bucket may emit an event seeded by
 * its own start time. As `now` advances, fresh buckets appear at the top — so
 * the feed grows live without any persisted state. An adjacent-duplicate guard
 * keeps the same line from ever stacking twice in a row.
 */
export function buildFeed(daySeed: number, now: number, limit = 12): FeedEvent[] {
  const bucket = 35 * SEC;
  const windowMs = 90 * 60 * SEC;
  const start = now - windowMs;
  const events: FeedEvent[] = [];

  const firstBucket = Math.ceil(start / bucket) * bucket;
  for (let t = firstBucket; t <= now; t += bucket) {
    const r = rng(daySeed, "feed", t);
    if (!r.chance(0.34)) continue;
    const tpl = pickTemplate(r);
    const { source, message } = tpl.build(r);
    // Jitter the displayed time within the bucket, but never past `now`.
    const time = Math.min(now, t + Math.floor(r.next() * bucket));
    events.push({ time, source, message, kind: tpl.kind });
  }

  events.sort((a, b) => b.time - a.time);

  // Drop a run of identical lines (same source + message) so nothing repeats
  // back-to-back on screen.
  const deduped: FeedEvent[] = [];
  for (const ev of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.source === ev.source && prev.message === ev.message) continue;
    deduped.push(ev);
  }

  return deduped.slice(0, limit);
}
