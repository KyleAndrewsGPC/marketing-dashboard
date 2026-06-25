import type { Accessor } from "solid-js";
import { clock, dateLabel, weekLabel } from "~/lib/format.ts";

/** Generic title bar — no company identity. Live clock, date, week, status. */
export function Header(props: { now: Accessor<number> }) {
  return (
    <header class="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3">
      <div class="flex items-center gap-4">
        <div class="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-semibold leading-tight tracking-tight">Mission Control</h1>
          <p class="text-xs text-muted-foreground">Live floor status · {weekLabel(props.now())}</p>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2 rounded-md border border-running/30 bg-running/10 px-3 py-1.5">
          <span class="pulse-dot inline-block h-2 w-2 rounded-full bg-running" />
          <span class="text-sm font-medium text-running">All systems operational</span>
        </div>
        <div class="text-right">
          <div class="font-mono text-2xl font-semibold leading-none tracking-tight">
            {clock(props.now())}
          </div>
          <div class="mt-1 text-xs text-muted-foreground">{dateLabel(props.now())}</div>
        </div>
      </div>
    </header>
  );
}
