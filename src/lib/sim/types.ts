/** Status color language from the README. */
export type LineStatus = "running" | "setup" | "maintenance" | "idle";

export interface WorkOrder {
  /** Generic, safe work-order id (e.g. "WO-4821"). */
  id: string;
  /** Generic customer descriptor — never a real name. */
  customer: string;
  /** Generic program / job type. */
  program: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  /** "Press" | "Finishing" — informational label. */
  kind: string;
  status: LineStatus;
  order: WorkOrder | null;
  /** 0..1 progress through the current run. */
  progress: number;
  /** Output rate, units/hour, for the current run. */
  speed: number;
  /** Human label for the unit being produced ("strips", "signs"). */
  unit: string;
  /** Minutes remaining on the current run (null when idle). */
  etaMinutes: number | null;
}

export interface Kpis {
  priceStrips: number;
  popSigns: number;
  impressions: number;
  dataRecords: number;
  onTimePct: number;
  activeLines: number;
  totalLines: number;
}

export interface PipelineStage {
  name: string;
  /** Records currently in this stage (WIP). */
  wip: number;
  /** Records/min flowing through. */
  ratePerMin: number;
  /** Cumulative records processed today. */
  processedToday: number;
}

export interface DataPipeline {
  stages: PipelineStage[];
  /** Records/min entering the funnel right now. */
  recordsPerMin: number;
  /** Exception rate, percent. */
  exceptionRate: number;
  totalProcessedToday: number;
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

export interface Snapshot {
  /** The timestamp this snapshot was derived from. */
  now: number;
  shift: string;
  kpis: Kpis;
  lines: ProductionLine[];
  throughput: ThroughputBar[];
  /** Peak hourly value across the day's curve — for chart scaling. */
  throughputPeak: number;
  pipeline: DataPipeline;
  feed: FeedEvent[];
  ticker: TickerStat[];
}
