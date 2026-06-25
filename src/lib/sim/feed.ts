import { rng } from "./prng.ts";
import { CUSTOMERS, LINE_DEFS, PROGRAMS, PIPELINE_STAGES } from "./content.ts";
import type { EventKind, FeedEvent } from "./types.ts";

const SEC = 1000;

interface Template {
  kind: EventKind;
  build: (r: ReturnType<typeof rng>) => { source: string; message: string };
}

const TEMPLATES: readonly Template[] = [
  {
    kind: "running",
    build: (r) => {
      const line = r.pick(LINE_DEFS);
      return {
        source: line.name.split(" · ")[0],
        message: `Run started · WO-${r.int(1000, 9999)} (${r.pick(CUSTOMERS)})`,
      };
    },
  },
  {
    kind: "info",
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
    kind: "setup",
    build: (r) => {
      const line = r.pick(LINE_DEFS);
      return {
        source: line.name.split(" · ")[0],
        message: `Make-ready started · ${r.pick(PROGRAMS)}`,
      };
    },
  },
  {
    kind: "info",
    build: (r) => ({
      source: "Composition",
      message: `${r.int(3, 24)} layouts auto-composed · ${r.pick(CUSTOMERS)}`,
    }),
  },
  {
    kind: "warn",
    build: (r) => ({
      source: "Preflight",
      message: `${r.int(1, 5)} exceptions flagged · auto-corrected`,
    }),
  },
  {
    kind: "running",
    build: (r) => ({
      source: "Proofing",
      message: `Proof approved · batch ${r.int(100, 999)}`,
    }),
  },
  {
    kind: "info",
    build: (r) => ({
      source: "Release",
      message: `Batch released to ${r.pick(["Press 1", "Press 2", "Press 3", "Press 4"])} · ${r.int(4, 40)} plates`,
    }),
  },
  {
    kind: "maintenance",
    build: (r) => {
      const line = r.pick(LINE_DEFS);
      return {
        source: line.name.split(" · ")[0],
        message: `Scheduled maintenance · ${r.int(20, 55)} min`,
      };
    },
  },
  {
    kind: "info",
    build: (r) => ({
      source: r.pick(PIPELINE_STAGES),
      message: `Throughput steady · ${r.int(800, 2400)} records/min`,
    }),
  },
];

/**
 * Generate the recent activity stream deterministically. We scan fixed-size
 * time buckets over a trailing window; each bucket may emit an event seeded by
 * its own start time. As `now` advances, fresh buckets appear at the top — so
 * the feed grows live without any persisted state.
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
    const tpl = r.pick(TEMPLATES);
    const { source, message } = tpl.build(r);
    // Jitter the displayed time within the bucket, but never past `now`.
    const time = Math.min(now, t + Math.floor(r.next() * bucket));
    events.push({ time, source, message, kind: tpl.kind });
  }

  events.sort((a, b) => b.time - a.time);
  return events.slice(0, limit);
}
