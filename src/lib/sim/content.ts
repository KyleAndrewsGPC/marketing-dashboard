/**
 * Generic, safe content pools. Per the hard constraints, the board shows NO
 * real customer names, programs, or company identity — only plausible,
 * industry-flavored placeholders drawn from these lists.
 */

export const FIXED_SEED = "production-control-center-v1";

/** Generic customer descriptors — categories, never real businesses. */
export const CUSTOMERS: readonly string[] = [
  "Regional Grocer",
  "National Pharmacy",
  "Home Improvement Co.",
  "Convenience Chain",
  "Sporting Goods Retailer",
  "Office Supply Group",
  "Pet Supply Chain",
  "Department Store",
  "Auto Parts Network",
  "Specialty Foods Co.",
  "Warehouse Club",
  "Electronics Retailer",
];

/** Generic program / job types. */
export const PROGRAMS: readonly string[] = [
  "Weekly Price Event",
  "Seasonal Reset",
  "New Item Tags",
  "Clearance Markdown",
  "Planogram Refresh",
  "Promo End-Cap",
  "Shelf Strip Run",
  "POP Sign Set",
  "Rollback Program",
  "Holiday Feature",
];

export interface LineDef {
  id: string;
  name: string;
  kind: string;
  unit: string;
  /** Output rate range, units/hour. */
  speedRange: [number, number];
}

/** The fixed roster of presses and finishing lines on the floor. */
export const LINE_DEFS: readonly LineDef[] = [
  { id: "L1", name: "Press 1 · Digital Web", kind: "Press", unit: "strips", speedRange: [9000, 13000] },
  { id: "L2", name: "Press 2 · Digital Web", kind: "Press", unit: "strips", speedRange: [8500, 12500] },
  { id: "L3", name: "Press 3 · UV Inkjet", kind: "Press", unit: "signs", speedRange: [1800, 3200] },
  { id: "L4", name: "Press 4 · Litho", kind: "Press", unit: "signs", speedRange: [2200, 3600] },
  { id: "L5", name: "Finishing · Cut & Stack", kind: "Finishing", unit: "strips", speedRange: [11000, 16000] },
  { id: "L6", name: "Finishing · Laminate", kind: "Finishing", unit: "signs", speedRange: [1400, 2400] },
];

/** Data pipeline stages, in funnel order. */
export const PIPELINE_STAGES: readonly string[] = [
  "Ingest",
  "Composition",
  "Preflight",
  "Proofing",
  "Release",
];

/**
 * Headline daily targets (end-of-day totals at full curve). All fabricated.
 * Volume metrics share the diurnal curve; only the magnitude differs.
 */
export const DAILY_TARGETS = {
  priceStrips: 61_000,
  popSigns: 8_400,
  impressions: 245_000,
  dataRecords: 1_180_000,
};
