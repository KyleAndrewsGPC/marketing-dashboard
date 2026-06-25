/** Display formatting helpers. Everything uses tabular figures upstream. */

export function int(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Compact form for tight spaces: 61,000 → 61.0k, 1,180,000 → 1.18M. */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return int(n);
}

export function clock(now: number): string {
  return new Date(now).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * ISO-8601 week label: "W{week}-{yy}", e.g. the first week of 2026 → "W01-26".
 * Uses the ISO week-year so the year is correct across the Jan 1 boundary.
 */
export function weekLabel(now: number): string {
  const date = new Date(now);
  // Shift to the Thursday of this week (ISO weeks are Thursday-anchored).
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();

  // Thursday of ISO week 1 is the Thursday in the week containing Jan 4.
  const week1Thursday = new Date(Date.UTC(isoYear, 0, 4));
  const week1DayNum = (week1Thursday.getUTCDay() + 6) % 7;
  week1Thursday.setUTCDate(week1Thursday.getUTCDate() - week1DayNum + 3);

  const week = 1 + Math.round((d.getTime() - week1Thursday.getTime()) / 604_800_000);
  const wk = String(week).padStart(2, "0");
  const yy = String(isoYear % 100).padStart(2, "0");
  return `W${wk}-${yy}`;
}

export function dateLabel(now: number): string {
  return new Date(now).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** "just now" / "3m ago" relative time for the activity feed. */
export function ago(time: number, now: number): string {
  const s = Math.max(0, Math.round((now - time) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function eta(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
