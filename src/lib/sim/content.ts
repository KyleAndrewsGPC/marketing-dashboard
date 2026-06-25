/**
 * Generic, safe, *configurable* content for the board.
 *
 * Per the hard constraints, nothing on screen maps to a real business: client
 * names are arbitrary CODENAMES you can edit freely (see `CLIENTS`), job-type
 * stage lists are generic industry flow (no proprietary system names), and the
 * sign-size codes are plain dimensional labels. The simulation reads only this
 * file for its vocabulary, so re-skinning the board's domain is a config edit.
 */

import type { Rng } from "./prng.ts";

export const FIXED_SEED = "production-control-center-v1";

/* ------------------------------------------------------------------ *
 * Job-type library
 *
 * Each job type is an ordered list of stages a job advances through, always
 * ending at "Finished". These mirror the *shape* of a real automated
 * print-production flow (intake → data prep → file generation → output →
 * stats) without any proprietary tool or process names.
 * ------------------------------------------------------------------ */

export interface JobType {
  label: string;
  /** Ordered stage names; the last is always the terminal "Finished". */
  stages: readonly string[];
}

export const JOB_TYPES: Readonly<Record<string, JobType>> = {
  weekly_tags: {
    label: "Weekly Tags",
    stages: ["Downloading", "Processing Data", "Generating Print Files", "Building Stats", "Finished"],
  },
  weekly_processing: {
    label: "Weekly Processing",
    stages: [
      "Downloading",
      "Batching",
      "Pulling Files",
      "Extracting Data",
      "Preparing Files",
      "Creating PDFs",
      "Building Stats",
      "Finished",
    ],
  },
  sign_kit: {
    label: "Sign Kit",
    stages: [
      "Loading Data",
      "Mapping Data",
      "Extracting Data",
      "Composing Files",
      "Routing to Output",
      "Building Stats",
      "Finished",
    ],
  },
  planogram: {
    label: "Planogram Signs",
    stages: ["Loading Store Data", "Processing Updates", "Creating Sign Files", "Routing to Output", "Finished"],
  },
  coupons: {
    label: "Digital Coupons",
    stages: ["Matching Files", "Loading Coupon Data", "Processing Coupons", "Routing to Output", "Finished"],
  },
  service_case: {
    label: "Service Case Signs",
    stages: ["Finding Files", "Processing Signs", "Finishing Signs", "Finished"],
  },
  price_import: {
    label: "Price Import",
    stages: ["Master Product Data", "Price Change Data", "Validating", "Finished"],
  },
  strips: {
    label: "Shelf Strips",
    stages: ["Staging", "Preparing Files", "Generating 5ft Files", "Generating 4ft Files", "Finished"],
  },
  monthly_kit: {
    label: "Monthly Kit",
    stages: ["Loading Orders", "Building Data", "Batching", "Generating PDFs", "Building Folders", "Generating Reports", "Finished"],
  },
};

type JobHandle = keyof typeof JOB_TYPES;

/* ------------------------------------------------------------------ *
 * Client roster
 *
 * `codename` is the ONLY thing shown on screen for a client — edit these
 * freely. `weight` biases how often a client appears across the processing
 * lanes (heavier clients show up more, like a high-volume account). `jobs`
 * lists which job types that client runs.
 * ------------------------------------------------------------------ */

export interface ClientDef {
  codename: string;
  /** Relative frequency across the lanes (higher = appears more often). */
  weight: number;
  jobs: readonly JobHandle[];
}

export const CLIENTS: readonly ClientDef[] = [
  { codename: "Atlas", weight: 6, jobs: ["weekly_tags", "sign_kit", "coupons", "strips", "price_import"] },
  { codename: "Helios", weight: 5, jobs: ["weekly_processing", "planogram", "coupons", "sign_kit", "price_import"] },
  { codename: "Athena", weight: 3, jobs: ["weekly_tags", "coupons", "service_case"] },
  { codename: "Hermes", weight: 3, jobs: ["weekly_tags", "coupons", "strips", "sign_kit"] },
  { codename: "Orion", weight: 2, jobs: ["weekly_processing", "service_case"] },
  { codename: "Apollo", weight: 2, jobs: ["weekly_tags", "coupons"] },
  { codename: "Selene", weight: 2, jobs: ["monthly_kit"] },
  { codename: "Hera", weight: 1, jobs: ["price_import", "strips"] },
  { codename: "Theseus", weight: 1, jobs: ["weekly_tags"] },
];

/** Pre-expanded weighted client index pool for cheap weighted picks. */
const CLIENT_POOL: number[] = CLIENTS.flatMap((c, i) => Array<number>(c.weight).fill(i));

export interface PickedJob {
  client: string;
  jobLabel: string;
  stages: readonly string[];
}

/** Weighted client pick, then a uniform job-type pick from that client. */
export function pickClientJob(r: Rng): PickedJob {
  const client = CLIENTS[r.pick(CLIENT_POOL)];
  const handle = r.pick(client.jobs);
  const jt = JOB_TYPES[handle];
  return { client: client.codename, jobLabel: jt.label, stages: jt.stages };
}

/* ------------------------------------------------------------------ *
 * Sign sizes (the "Sign Count" panel)
 *
 * Generic dimensional codes — never customer-specific SKUs. `daily` is the
 * fabricated end-of-day volume at full curve; counts accumulate toward it
 * through the day. The totals land in the millions to match real-world scale.
 * ------------------------------------------------------------------ */

export interface SignSize {
  code: string;
  daily: number;
}

export const SIGN_SIZES: readonly SignSize[] = [
  { code: "2X1", daily: 540_000 },
  { code: "2X2.5", daily: 360_000 },
  { code: "2X3.5", daily: 250_000 },
  { code: "7X11", daily: 210_000 },
  { code: "4FT Strip", daily: 160_000 },
  { code: "3.5X6", daily: 120_000 },
  { code: "5X7", daily: 95_000 },
  { code: "7X3", daily: 90_000 },
  { code: "Shelf Strip", daily: 72_000 },
  { code: "8X4", daily: 28_000 },
  { code: "5FT Strip", daily: 18_000 },
  { code: "Vinyl", daily: 9_000 },
];

/** Sum of all sign-size daily targets — the headline "Signs Today" full-day total. */
export const SIGN_TOTAL: number = SIGN_SIZES.reduce((sum, s) => sum + s.daily, 0);

/** Generic intake channels for ingest-related feed events. */
export const INGEST_SOURCES: readonly string[] = [
  "SFTP drop",
  "API feed",
  "Email intake",
  "Web upload",
  "EDI feed",
  "Watch folder",
];

/** Generic substrate / stock names for material-related feed events. */
export const SUBSTRATES: readonly string[] = [
  "12pt C2S",
  "14pt C1S",
  "100# gloss text",
  "synthetic stock",
  "adhesive vinyl",
  "10pt coated",
];

/**
 * Headline daily targets (end-of-day totals at full curve). All fabricated.
 * Volume metrics share the diurnal curve; only the magnitude differs.
 * `signs` mirrors the sign-count panel total so the two always agree.
 */
export const DAILY_TARGETS = {
  signs: SIGN_TOTAL,
  strips: 42_000,
  records: 3_200_000,
  // Electronic shelf labels — a newer line the business is expanding into,
  // so volumes are modest next to the print metrics.
  esls: 3_800,
  jobsDone: 540,
};
