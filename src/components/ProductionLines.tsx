import { For, Show, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import type { ProductionLine } from "~/lib/sim/types.ts";
import { Card, StatusDot, statusColor, statusLabel } from "./ui.tsx";
import { eta, int } from "~/lib/format.ts";

function LineRow(props: { line: ProductionLine }) {
  const l = () => props.line;
  const active = () => l().status === "running";
  return (
    <div class="grid grid-cols-[1.6fr_2fr_auto] items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2">
      {/* Line identity + status */}
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <StatusDot status={l().status} pulse={active()} />
          <span class="truncate text-sm font-medium">{l().name}</span>
        </div>
        <div class={`mt-0.5 text-xs ${statusColor(l().status)}`}>{statusLabel(l().status)}</div>
      </div>

      {/* Current work order + progress */}
      <div class="min-w-0">
        <Show
          when={l().order}
          fallback={<div class="text-xs text-muted-foreground">— no active order —</div>}
        >
          {(order) => (
            <div class="truncate text-xs text-muted-foreground">
              <span class="font-mono text-foreground">{order().id}</span> · {order().customer} ·{" "}
              {order().program}
            </div>
          )}
        </Show>
        <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            class={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
              active() ? "bg-running" : l().status === "setup" ? "bg-setup" : "bg-idle"
            }`}
            style={{ width: `${Math.round(l().progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Speed + ETA */}
      <div class="w-28 text-right">
        <div class="font-mono text-sm tabular-nums">
          <Show when={active()} fallback={<span class="text-muted-foreground">—</span>}>
            {int(l().speed)}
            <span class="text-[0.65rem] text-muted-foreground"> /hr</span>
          </Show>
        </div>
        <div class="text-[0.7rem] text-muted-foreground">
          ETA {eta(l().etaMinutes)}
        </div>
      </div>
    </div>
  );
}

export function ProductionLines(props: { snap: Accessor<Snapshot> }) {
  return (
    <Card
      title="Production Lines"
      accessory={
        <span class="text-[0.7rem] text-muted-foreground">
          {props.snap().kpis.activeLines} running
        </span>
      }
      bodyClass="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-3"
    >
      <For each={props.snap().lines}>{(line) => <LineRow line={line} />}</For>
    </Card>
  );
}
