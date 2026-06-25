import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import { int } from "~/lib/format.ts";

interface Kpi {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}

/** Headline daily totals. Big tabular numerals, calm supporting labels. */
export function KpiRow(props: { snap: Accessor<Snapshot> }) {
  const kpis = (): Kpi[] => {
    const k = props.snap().kpis;
    return [
      { label: "Signs Today", value: int(k.signs), hint: "generated" },
      { label: "Print Files", value: int(k.printFiles), hint: "produced" },
      { label: "Records", value: int(k.records), hint: "processed" },
      { label: "Jobs Done", value: int(k.jobsDone), hint: "today" },
      { label: "On-Time", value: `${k.onTimePct.toFixed(1)}%`, hint: "rolling", accent: true },
      { label: "Lanes Active", value: `${k.activeJobs}/${k.totalLanes}`, hint: "running" },
    ];
  };

  return (
    <div class="grid grid-cols-6 gap-3">
      <For each={kpis()}>
        {(kpi) => (
          <div class="flex flex-col justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div class="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {kpi.label}
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span
                class={`font-mono text-[1.75rem] font-semibold leading-none tracking-tight ${
                  kpi.accent ? "text-running" : "text-foreground"
                }`}
              >
                {kpi.value}
              </span>
            </div>
            <div class="mt-1 text-[0.7rem] text-muted-foreground">{kpi.hint}</div>
          </div>
        )}
      </For>
    </div>
  );
}
