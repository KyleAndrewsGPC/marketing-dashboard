import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import { Card, StatusDot } from "./ui.tsx";
import { ago } from "~/lib/format.ts";

/** Live stream of job and pipeline events, newest first. */
export function ActivityFeed(props: { now: Accessor<number>; snap: Accessor<Snapshot> }) {
  return (
    <Card title="Activity Feed" bodyClass="flex min-h-0 flex-1 flex-col gap-0.5 px-2 pb-2">
      <For each={props.snap().feed}>
        {(ev) => (
          <div class="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <StatusDot status={ev.kind} />
            <div class="min-w-0 flex-1">
              <div class="truncate text-[0.8rem] leading-tight">
                <span class="font-medium text-foreground">{ev.source}</span>{" "}
                <span class="text-muted-foreground">{ev.message}</span>
              </div>
            </div>
            <div class="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
              {ago(ev.time, props.now())}
            </div>
          </div>
        )}
      </For>
    </Card>
  );
}
