import { For, createMemo, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import { Card } from "./ui.tsx";
import { compact } from "~/lib/format.ts";

// Whole-literal class strings so Tailwind's JIT scanner keeps them.
const STROKE = { accent: "stroke-accent", brand: "stroke-brand", running: "stroke-running" };
const FILL = { accent: "fill-accent", brand: "fill-brand", running: "fill-running" };
const DOT = { accent: "bg-accent", brand: "bg-brand", running: "bg-running" };
const TEXT = { accent: "text-accent", brand: "text-brand", running: "text-running" };

const TOP = 8;
const BOT = 92;

function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function areaPath(pts: { x: number; y: number }[]): string {
  // Fill down to the viewBox floor so the series read as stacked translucent areas.
  return `${linePath(pts)} L 100 100 L 0 100 Z`;
}

/**
 * Week-over-week output history for the last ~3 months as an overlapping area
 * chart. The three lines span ~500× in absolute volume (signs ≫ strips ≫ ESLs),
 * so plotting raw values would flatten two of them to the floor. Instead each
 * series is indexed to its first week (= 100) and drawn on a shared "% vs wk 1"
 * axis: they start together on the left, overlap honestly, and every trend is
 * legible. The legend carries the real latest weekly totals.
 */
export function HistoryChart(props: { snap: Accessor<Snapshot> }) {
  const history = () => props.snap().history;

  const chart = createMemo(() => {
    const series = history().series;
    const n = series[0]?.values.length ?? 0;
    const xOf = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);

    // Index each series to its own first week, so all share a "= 100" baseline.
    const indexed = series.map((s) => {
      const base = s.values[0] || 1;
      return { color: s.color, vals: s.values.map((v) => (v / base) * 100) };
    });

    // Zoom the y-axis to the data band (always keeping 100 in view), with padding.
    const all = indexed.flatMap((s) => s.vals).concat(100);
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    const pad = Math.max(2, (hi - lo) * 0.18);
    lo -= pad;
    hi += pad;
    const span = hi - lo || 1;
    const yOf = (val: number) => BOT - ((val - lo) / span) * (BOT - TOP);

    const built = indexed.map((s) => {
      const pts = s.vals.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
      return { color: s.color, line: linePath(pts), area: areaPath(pts) };
    });

    return { built, y100: yOf(100) };
  });

  return (
    <Card
      title="Output History · Weekly"
      accessory={
        <span class="font-mono text-[0.7rem] text-muted-foreground">
          indexed · wk 1 = 100
        </span>
      }
      bodyClass="flex min-h-0 flex-1 flex-col px-4 pb-2"
    >
      {/* Legend — real latest weekly totals */}
      <div class="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <For each={history().series}>
          {(s) => (
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

      {/* Overlapping indexed area chart */}
      <div class="relative min-h-0 flex-1">
        <svg
          class="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* 100 baseline reference */}
          <line
            x1="0"
            x2="100"
            y1={chart().y100}
            y2={chart().y100}
            class="stroke-border"
            stroke-width="1"
            stroke-dasharray="3 3"
            vector-effect="non-scaling-stroke"
          />
          <For each={chart().built}>
            {(s) => (
              <>
                <path d={s.area} class={FILL[s.color]} fill-opacity="0.14" />
                <path
                  d={s.line}
                  class={STROKE[s.color]}
                  fill="none"
                  stroke-width="1.75"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                />
              </>
            )}
          </For>
        </svg>
        {/* baseline tick label (HTML, to avoid SVG text distortion) */}
        <span
          class="pointer-events-none absolute left-0 -translate-y-1/2 bg-card pr-1 font-mono text-[0.55rem] text-muted-foreground"
          style={{ top: `${chart().y100}%` }}
        >
          100
        </span>
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
