import type { Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import type { FloorStatusKind } from "~/lib/sim/types.ts";
import { clock, dateLabel, weekLabel } from "~/lib/format.ts";
import { VelosMark } from "./ui.tsx";

// Literal class sets per status kind (kept whole so Tailwind's scanner sees them).
const PILL: Record<FloorStatusKind, { wrap: string; dot: string; text: string; pulse: boolean }> = {
  ok: { wrap: "border-running/30 bg-running/10", dot: "bg-running", text: "text-running", pulse: true },
  maintenance: {
    wrap: "border-maintenance/30 bg-maintenance/10",
    dot: "bg-maintenance",
    text: "text-maintenance",
    pulse: false,
  },
  idle: { wrap: "border-idle/30 bg-idle/10", dot: "bg-idle", text: "text-idle", pulse: false },
};

/** Velos-branded title bar. Logo mark, board name, live clock, date, week. */
export function Header(props: { now: Accessor<number>; snap: Accessor<Snapshot> }) {
  const status = () => props.snap().floorStatus;
  const pill = () => PILL[status().kind];
  return (
    <header class="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3">
      <div class="flex items-center gap-4">
        <div class="flex h-10 w-10 items-center justify-center rounded-md bg-background ring-1 ring-border">
          <VelosMark class="h-5 w-7" />
        </div>
        <div>
          <h1 class="text-lg font-semibold leading-tight tracking-tight">Velos Mission Control</h1>
          <p class="text-xs text-muted-foreground">Live system status · {weekLabel(props.now())}</p>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <div class={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${pill().wrap}`}>
          <span
            class={`inline-block h-2 w-2 rounded-full ${pill().dot} ${pill().pulse ? "pulse-dot" : ""}`}
          />
          <span class={`text-sm font-medium ${pill().text}`}>{status().label}</span>
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
