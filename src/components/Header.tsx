import type { Accessor } from "solid-js";
import { clock, dateLabel, weekLabel } from "~/lib/format.ts";
import { VelosMark } from "./ui.tsx";

/** Velos-branded title bar. Logo mark, board name, live clock, date, week. */
export function Header(props: { now: Accessor<number> }) {
  return (
    <header class="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3">
      <div class="flex items-center gap-4">
        <div class="flex h-10 w-10 items-center justify-center rounded-md bg-background ring-1 ring-border">
          <VelosMark class="h-5 w-7" />
        </div>
        <div>
          <div class="flex items-center gap-2 text-[0.6rem] font-bold uppercase leading-none tracking-[0.32em]">
            <span class="text-accent">Velos</span>
            <span class="text-muted-foreground tracking-[0.18em]">Powered by GPC</span>
          </div>
          <h1 class="mt-1 text-lg font-semibold leading-tight tracking-tight">Mission Control</h1>
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
