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
