import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import { Card } from "./ui.tsx";
import { compact } from "~/lib/format.ts";

/** Output-by-hour bars for the current production day, filling as it proceeds. */
export function ThroughputChart(props: { snap: Accessor<Snapshot> }) {
  const peak = () => props.snap().throughputPeak || 1;
  const dayTotal = () => props.snap().kpis.priceStrips;

  return (
    <Card
      title="Throughput · Price Strips / Hour"
      accessory={
        <span class="font-mono text-[0.7rem] text-muted-foreground">
          {compact(dayTotal())} today
        </span>
      }
      bodyClass="flex min-h-0 flex-1 flex-col px-4 pb-2"
    >
      <div class="flex min-h-0 flex-1 items-end gap-[3px]">
        <For each={props.snap().throughput}>
          {(bar) => {
            const pct = () => Math.max(2, Math.round((bar.value / peak()) * 100));
            return (
              <div class="group flex h-full flex-1 flex-col justify-end" title={`${bar.hour}:00`}>
                <div
                  class={`w-full rounded-sm transition-[height] duration-1000 ease-linear ${
                    bar.future
                      ? "bg-muted/40"
                      : bar.current
                        ? "bg-brand"
                        : "bg-accent/55"
                  }`}
                  style={{ height: bar.future ? "2%" : `${pct()}%` }}
                />
              </div>
            );
          }}
        </For>
      </div>
      {/* Hour axis: label every 3 hours to stay uncluttered. */}
      <div class="mt-1.5 flex gap-[3px]">
        <For each={props.snap().throughput}>
          {(bar) => (
            <div class="flex-1 text-center text-[0.6rem] tabular-nums text-muted-foreground">
              {bar.hour % 3 === 0 ? bar.hour.toString().padStart(2, "0") : ""}
            </div>
          )}
        </For>
      </div>
    </Card>
  );
}
