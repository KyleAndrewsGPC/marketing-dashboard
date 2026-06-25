import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import type { ClientJob } from "~/lib/sim/types.ts";
import { Card, StatusDot, statusColor, jobStatusLabel } from "./ui.tsx";
import { eta } from "~/lib/format.ts";

function JobRow(props: { job: ClientJob }) {
  const j = () => props.job;
  const running = () => j().status === "running";
  const activeStages = () => Math.max(1, j().stages.length - 1);
  const stage = () => j().stages[j().stageIndex] ?? "";

  return (
    <div class="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      {/* Client · job type + stage counter / ETA */}
      <div class="flex items-center gap-2">
        <StatusDot status={j().status} pulse={running()} />
        <span class="truncate text-sm font-semibold">{j().client}</span>
        <span class="truncate text-sm text-muted-foreground">· {j().jobLabel}</span>
        <span class="ml-auto shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
          stage {Math.min(j().stageIndex + 1, activeStages())}/{activeStages()} · ETA {eta(j().etaMinutes)}
        </span>
      </div>

      {/* Current stage + live sub-status */}
      <div class="mt-1 flex items-baseline gap-2 text-xs">
        <span class={`shrink-0 font-medium ${statusColor(j().status)}`}>
          {j().status === "review" ? jobStatusLabel("review") : stage()}
        </span>
        <span class="truncate text-muted-foreground">{j().detail}</span>
      </div>

      {/* Overall progress */}
      <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          class={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            running() ? "bg-running" : j().status === "review" ? "bg-maintenance" : "bg-idle"
          }`}
          style={{ width: `${Math.round(j().overallProgress * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function ActiveJobs(props: { snap: Accessor<Snapshot> }) {
  return (
    <Card
      title="Active Jobs"
      accessory={
        <span class="text-[0.7rem] text-muted-foreground">
          {props.snap().kpis.activeJobs}/{props.snap().kpis.totalLanes} lanes running
        </span>
      }
      bodyClass="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-3"
    >
      <For each={props.snap().jobs}>{(job) => <JobRow job={job} />}</For>
    </Card>
  );
}
