import { rng, type Rng } from "./prng.ts";
import { INGEST_SOURCES, SIGN_SIZES, SUBSTRATES, pickClientJob } from "./content.ts";
import type { EventKind, FeedEvent } from "./types.ts";

const SEC = 1000;

const sizeCode = (r: Rng) => r.pick(SIGN_SIZES).code;

interface Template {
  kind: EventKind;
  /** Relative likelihood. Healthy events common; warn/maintenance occasional. */
  weight: number;
  build: (r: Rng) => { source: string; message: string };
}

/*
 * A broad vocabulary spanning the whole automated workflow — intake, data
 * prep, file generation, output, stats, dispatch, QC — phrased in the client /
 * job-type / sign-size language the rest of the board uses. Each template also
 * varies internally (clients, job types, sizes, counts), so the effective
 * space of distinct messages stays large enough that the feed never reads as a
 * short loop, even running unattended all day. Weights keep the tone calm:
 * mostly routine activity, with warnings and maintenance as occasional color.
 */
const TEMPLATES: readonly Template[] = [
  // ---- Job lifecycle (running) ----
  {
    kind: "running",
    weight: 5,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: j.client, message: `${j.jobLabel} started` };
    },
  },
  {
    kind: "running",
    weight: 4,
    build: (r) => {
      const j = pickClientJob(r);
      const qty = r.int(2, 240) * 1000;
      return { source: j.client, message: `${j.jobLabel} finished · ${qty.toLocaleString()} signs` };
    },
  },
  {
    kind: "running",
    weight: 3,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: j.client, message: `${j.jobLabel} · routed to output · ${r.int(2, 12)} batches` };
    },
  },

  // ---- Routine throughput (info) ----
  {
    kind: "info",
    weight: 4,
    build: (r) => ({
      source: "Ingest",
      message: `${r.int(2, 40)} files received · ${r.pick(INGEST_SOURCES)}`,
    }),
  },
  {
    kind: "info",
    weight: 3,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: "Ingest", message: `${j.jobLabel} imported · ${r.int(40, 1800).toLocaleString()} SKUs · ${j.client}` };
    },
  },
  {
    kind: "info",
    weight: 3,
    build: (r) => ({
      source: "Output",
      message: `${sizeCode(r)} print files generated · ${r.int(200, 9000).toLocaleString()}`,
    }),
  },
  {
    kind: "info",
    weight: 3,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: "Prepress", message: `${r.int(3, 24)} layouts composed · ${j.client}` };
    },
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: "Stats", message: `Stats built · ${j.client} ${j.jobLabel}` };
    },
  },
  {
    kind: "info",
    weight: 2,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: "Dispatch", message: `Shipment staged · ${r.int(2, 24)} cartons · ${j.client}` };
    },
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
    weight: 1,
    build: (r) => ({
      source: "Output",
      message: `Throughput steady · ${r.int(800, 2400)} files/min`,
    }),
  },
  {
    kind: "info",
    weight: 1,
    build: (r) => ({
      source: "Dispatch",
      message: `Roll change · ${r.pick(SUBSTRATES)}`,
    }),
  },

  // ---- Queue / setup ----
  {
    kind: "setup",
    weight: 3,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: j.client, message: `${j.jobLabel} queued` };
    },
  },
  {
    kind: "setup",
    weight: 1,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: "Prepress", message: `Batching · ${j.client} ${j.jobLabel}` };
    },
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
    build: (r) => {
      const j = pickClientJob(r);
      return { source: "Preflight", message: `Low-res image replaced · ${j.client}` };
    },
  },
  {
    kind: "warn",
    weight: 1,
    build: (r) => {
      const j = pickClientJob(r);
      return { source: j.client, message: `${j.jobLabel} held for review` };
    },
  },

  // ---- Maintenance ----
  {
    kind: "maintenance",
    weight: 1,
    build: (r) => ({
      source: "Output",
      message: `Scheduled maintenance · ${r.int(20, 55)} min`,
    }),
  },
];

const TOTAL_WEIGHT = TEMPLATES.reduce((sum, t) => sum + t.weight, 0);

/** Weighted template pick using one draw from the bucket's PRNG. */
function pickTemplate(r: Rng): Template {
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
 * keeps the same source+message from ever stacking twice in a row.
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
    const time = Math.min(now, t + Math.floor(r.next() * bucket));
    events.push({ time, source, message, kind: tpl.kind });
  }

  events.sort((a, b) => b.time - a.time);

  const deduped: FeedEvent[] = [];
  for (const ev of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.source === ev.source && prev.message === ev.message) continue;
    deduped.push(ev);
  }

  return deduped.slice(0, limit);
}
