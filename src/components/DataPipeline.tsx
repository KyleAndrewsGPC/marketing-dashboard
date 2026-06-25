import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import { Card } from "./ui.tsx";
import { compact, int } from "~/lib/format.ts";

/** The data-processing funnel: Ingest → Composition → Preflight → Proofing → Release. */
export function DataPipeline(props: { snap: Accessor<Snapshot> }) {
  const pipe = () => props.snap().pipeline;
  const maxWip = () => Math.max(1, ...pipe().stages.map((s) => s.wip));

  return (
    <Card
      title="Data Pipeline"
      accessory={
        <span class="font-mono text-[0.7rem] text-muted-foreground">
          {int(pipe().recordsPerMin)} rec/min
        </span>
      }
      bodyClass="flex min-h-0 flex-1 flex-col gap-1.5 px-4 pb-3"
    >
      <For each={pipe().stages}>
        {(stage, i) => (
          <div class="flex items-center gap-3">
            <div class="flex w-24 items-center gap-2">
              <span class="font-mono text-[0.65rem] text-muted-foreground">{i() + 1}</span>
              <span class="text-sm font-medium">{stage.name}</span>
            </div>
            <div class="relative h-5 flex-1 overflow-hidden rounded bg-muted/40">
              <div
                class="h-full rounded bg-maintenance/35 transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.round((stage.wip / maxWip()) * 100)}%` }}
              />
              <span class="absolute inset-y-0 left-2 flex items-center font-mono text-[0.7rem] text-foreground/80">
                {int(stage.wip)} wip
              </span>
            </div>
            <div class="w-20 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {compact(stage.processedToday)}
            </div>
          </div>
        )}
      </For>

      <div class="mt-auto flex items-center justify-between border-t border-border/60 pt-2 text-xs">
        <span class="text-muted-foreground">
          Exception rate{" "}
          <span class="font-mono text-setup">{pipe().exceptionRate.toFixed(2)}%</span>
        </span>
        <span class="text-muted-foreground">
          Released today{" "}
          <span class="font-mono text-foreground">{compact(pipe().totalProcessedToday)}</span>
        </span>
      </div>
    </Card>
  );
}
