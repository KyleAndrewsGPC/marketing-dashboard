import { For, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import type { HistorySeries } from "~/lib/sim/history.ts";
import { Card } from "./ui.tsx";
import { compact } from "~/lib/format.ts";

// Whole-literal class strings so Tailwind's JIT scanner keeps them.
const STROKE = { accent: "stroke-accent", brand: "stroke-brand", running: "stroke-running" };
const FILL = { accent: "fill-accent", brand: "fill-brand", running: "fill-running" };
const DOT = { accent: "bg-accent", brand: "bg-brand", running: "bg-running" };
const TEXT = { accent: "text-accent", brand: "text-brand", running: "text-running" };

// Deviation-to-pixels gain: a series' weekly value is plotted as its percentage
// deviation from the series mean, so the curve's amplitude reflects the *real*
// (gentle) variation rather than being stretched to fill the panel. ±6% jitter
// lands at roughly ±10 viewBox units — slight ups and downs around a steady line.
const GAIN = 160;

/**
 * Map a series' weekly values to {x,y} points inside its own horizontal lane.
 * Lanes keep the three very-different-magnitude series separated and legible;
 * within a lane each point sits at laneMid offset by its deviation from mean.
 */
function points(values: number[], laneTop: number, laneBottom: number) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length || 1;
  const mid = (laneTop + laneBottom) / 2;
  const n = values.length;
  const clamp = (y: number) => Math.max(laneTop, Math.min(laneBottom, y));
  return values.map((v, i) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: clamp(mid - (v / mean - 1) * GAIN),
  }));
}

function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function areaPath(pts: { x: number; y: number }[], baseline: number): string {
  return `${linePath(pts)} L 100 ${baseline} L 0 ${baseline} Z`;
}

/**
 * Week-over-week output history for the last ~3 months. Signs, strips and ESLs
 * each normalized to their own range so the trend of every line is visible —
 * the legend carries the actual latest weekly totals.
 */
export function HistoryChart(props: { snap: Accessor<Snapshot> }) {
  const history = () => props.snap().history;

  return (
    <Card
      title="Output History · Weekly"
      accessory={
        <span class="font-mono text-[0.7rem] text-muted-foreground">
          {history().weeks}-week view
        </span>
      }
      bodyClass="flex min-h-0 flex-1 flex-col px-4 pb-2"
    >
      {/* Legend */}
      <div class="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <For each={history().series}>
          {(s: HistorySeries) => (
            <div class="flex items-center gap-1.5">
              <span class={`inline-block h-2 w-2 rounded-full ${DOT[s.color]}`} />
              <span class="text-[0.7rem] text-muted-foreground">{s.label}</span>
              <span class={`font-mono text-[0.7rem] font-semibold ${TEXT[s.color]}`}>
                {compact(s.latest)}
              </span>
            </div>
          )}
        </For>
      </div>

      {/* Overlaid area chart */}
      <div class="relative min-h-0 flex-1">
        <svg
          class="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <For each={history().series}>
            {(s: HistorySeries, i) => {
              const lanes = history().series.length;
              const laneH = 100 / lanes;
              const laneTop = i() * laneH + 5;
              const laneBottom = (i() + 1) * laneH - 3;
              const pts = points(s.values, laneTop, laneBottom);
              return (
                <>
                  <path d={areaPath(pts, laneBottom)} class={FILL[s.color]} fill-opacity="0.12" />
                  <path
                    d={linePath(pts)}
                    class={STROKE[s.color]}
                    fill="none"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                    vector-effect="non-scaling-stroke"
                  />
                </>
              );
            }}
          </For>
        </svg>
      </div>

      {/* Week axis: first, middle, last to stay uncluttered. */}
      <div class="mt-1 flex justify-between text-[0.6rem] tabular-nums text-muted-foreground">
        <span>{history().labels[0]}</span>
        <span>{history().labels[Math.floor(history().labels.length / 2)]}</span>
        <span>{history().labels[history().labels.length - 1]}</span>
      </div>
    </Card>
  );
}
