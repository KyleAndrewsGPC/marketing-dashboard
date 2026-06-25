import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";

/** Week-to-date totals and ambient stats along the bottom edge. */
export function Ticker(props: { snap: Accessor<Snapshot> }) {
  return (
    <footer class="glass-panel flex items-center gap-6 overflow-hidden rounded-lg px-5 py-2.5">
      <div class="flex items-center gap-2 shrink-0">
        <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-brand" />
        <span class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Week to date
        </span>
      </div>
      <div class="flex flex-1 items-center justify-between gap-6">
        <For each={props.snap().ticker}>
          {(stat) => (
            <div class="flex items-baseline gap-2 whitespace-nowrap">
              <span class="text-[0.7rem] text-muted-foreground">{stat.label}</span>
              <span class="font-mono text-sm font-medium tabular-nums">{stat.value}</span>
            </div>
          )}
        </For>
      </div>
    </footer>
  );
}
