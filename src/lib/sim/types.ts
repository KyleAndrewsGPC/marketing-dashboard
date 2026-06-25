import type { History } from "./history.ts";

/** Status color language from the README. */
export type LineStatus = "running" | "setup" | "maintenance" | "idle";

/** Live state of a client job as it advances through its stages. */
export type JobStatus = "running" | "queued" | "review" | "done";

export interface ClientJob {
  /** Stable processing-lane id (e.g. "LN1"). */
  laneId: string;
  /** Client codename — an arbitrary, configurable label (never a real name). */
  client: string;
  /** Job-type label, e.g. "Sign Kit". */
  jobLabel: string;
  /** Full ordered stage list for this job type. */
  stages: readonly string[];
  /** Index of the current stage within `stages`. */
  stageIndex: number;
  /** 0..1 progress within the current stage. */
  stageProgress: number;
  /** 0..1 progress across the whole job. */
  overallProgress: number;
  /** Live sub-status line, e.g. "Generating print files · 6 of 9". */
  detail: string;
  status: JobStatus;
  /** Minutes remaining until the job finishes (null when not running). */
  etaMinutes: number | null;
}

export interface Kpis {
  /** Tags / signs generated today (= sign-count panel total). */
  signs: number;
  /** Shelf strips produced today. */
  strips: number;
  /** Data records processed today. */
  records: number;
  /** Electronic shelf labels published today. */
  esls: number;
  /** Jobs completed today. */
  jobsDone: number;
  onTimePct: number;
  /** Lanes currently running a job. */
  activeJobs: number;
  totalLanes: number;
}

/** One row of the Sign Count panel. */
export interface SignCountRow {
  code: string;
  /** Cumulative count produced so far today. */
  count: number;
  /** Always trending up while the day accumulates. */
  trend: "up" | "flat";
}

export interface SignCount {
  rows: SignCountRow[];
  total: number;
}

export type EventKind = "running" | "setup" | "maintenance" | "info" | "warn";

export interface FeedEvent {
  /** epoch ms */
  time: number;
  source: string;
  message: string;
  kind: EventKind;
}

export interface ThroughputBar {
  /** Hour of day, 0..23. */
  hour: number;
  /** Units produced that hour. */
  value: number;
  /** True for the in-progress current hour (partial). */
  current: boolean;
  /** True for hours not yet reached today. */
  future: boolean;
}

export interface TickerStat {
  label: string;
  value: string;
}

/** Headline floor health, derived from the live job states. */
export type FloorStatusKind = "ok" | "maintenance" | "idle";
export interface FloorStatus {
  kind: FloorStatusKind;
  label: string;
}

export interface Snapshot {
  /** The timestamp this snapshot was derived from. */
  now: number;
  shift: string;
  kpis: Kpis;
  jobs: ClientJob[];
  throughput: ThroughputBar[];
  /** Peak hourly value across the day's curve — for chart scaling. */
  throughputPeak: number;
  signCount: SignCount;
  history: History;
  feed: FeedEvent[];
  ticker: TickerStat[];
  floorStatus: FloorStatus;
}
