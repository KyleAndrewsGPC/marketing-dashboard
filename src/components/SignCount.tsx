import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import { Card } from "./ui.tsx";
import { compact, int } from "~/lib/format.ts";

/** Cumulative sign volume by size code for the day — counts climb, total sums. */
export function SignCount(props: { snap: Accessor<Snapshot> }) {
  const sc = () => props.snap().signCount;

  return (
    <Card
      title="Sign Count"
      accessory={
        <span class="font-mono text-[0.7rem] text-muted-foreground">{compact(sc().total)} today</span>
      }
      bodyClass="flex min-h-0 flex-1 flex-col px-3 pb-3"
    >
      <div class="min-h-0 flex-1 overflow-hidden">
        <For each={sc().rows}>
          {(row) => (
            <div class="flex items-center justify-between border-b border-border/40 px-1 py-[0.3rem] text-sm last:border-0">
              <span class="font-mono text-xs text-muted-foreground">{row.code}</span>
              <span class="flex items-center gap-2">
                <span class="font-mono tabular-nums">{int(row.count)}</span>
                <span class={`text-[0.7rem] ${row.trend === "up" ? "text-running" : "text-idle"}`}>
                  {row.trend === "up" ? "▲" : "—"}
                </span>
              </span>
            </div>
          )}
        </For>
      </div>

      <div class="mt-1 flex items-center justify-between rounded-md bg-accent/10 px-2 py-1.5">
        <span class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-accent">Total</span>
        <span class="font-mono text-sm font-semibold tabular-nums text-accent">{int(sc().total)}</span>
      </div>
    </Card>
  );
}
