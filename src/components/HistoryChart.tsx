import { For, createMemo, type Accessor } from "solid-js";
import type { Snapshot } from "~/lib/sim/index.ts";
import { Card } from "./ui.tsx";
import { compact } from "~/lib/format.ts";

// Whole-literal class strings so Tailwind's JIT scanner keeps them.
const STROKE = { accent: "stroke-accent", brand: "stroke-brand", running: "stroke-running" };
const FILL = { accent: "fill-accent", brand: "fill-brand", running: "fill-running" };
const DOT = { accent: "bg-accent", brand: "bg-brand", running: "bg-running" };
const TEXT = { accent: "text-accent", brand: "text-brand", running: "text-running" };

const TOP = 6;
const BOT = 94;

/** Short axis label: 15_000_000 → "15M", 250_000 → "250k". */
function axisLabel(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (v >= 1_000) {
    const k = v / 1_000;
    return `${Number.isInteger(k) ? k : Math.round(k)}k`;
  }
  return String(Math.round(v));
}

/** "Nice" round axis ticks from 0 up to a headroom max above `max`. */
function niceTicks(max: number, count: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step * 0.5; t += step) ticks.push(t);
  return ticks;
}

function bandPath(top: { x: number; y: number }[], bottom: { x: number; y: number }[]): string {
  const up = top.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const down = bottom
    .slice()
    .reverse()
    .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  return `${up} ${down} Z`;
}

function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

/**
 * Week-over-week output history for the last ~3 months as a STACKED area chart:
 * the Y axis is the real summed weekly count and the bands stack largest →
 * smallest (signs, then strips, then ESLs). Because signs dwarf the other two
 * (~12M vs ~250k vs ~25k a week), strips and ESLs read as thin bands near the
 * top — that's the honest proportion; the legend carries each line's true total.
 */
export function HistoryChart(props: { snap: Accessor<Snapshot> }) {
  const history = () => props.snap().history;

  const chart = createMemo(() => {
    const series = history().series;
    const n = series[0]?.values.length ?? 0;
    const xOf = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);

    // Highest weekly grand-total drives the axis.
    let maxTotal = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const s of series) sum += s.values[i];
      maxTotal = Math.max(maxTotal, sum);
    }

    const ticks = niceTicks(maxTotal, 3);
    const yMax = ticks[ticks.length - 1] || 1;
    const yOf = (v: number) => BOT - (v / yMax) * (BOT - TOP);

    // Stack the series: each band sits on the running cumulative below it.
    let lower = new Array(n).fill(0);
    const bands = series.map((s) => {
      const lo = lower.slice();
      const hi = lo.map((base, i) => base + s.values[i]);
      lower = hi;
      const topPts = hi.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
      const botPts = lo.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
      return { color: s.color, area: bandPath(topPts, botPts), line: linePath(topPts) };
    });

    return { bands, ticks: ticks.map((t) => ({ v: t, top: yOf(t) })) };
  });

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

      {/* Stacked area chart with a real value Y axis */}
      <div class="flex min-h-0 flex-1">
        {/* Y-axis labels */}
        <div class="relative w-9 shrink-0">
          <For each={chart().ticks}>
            {(t) => (
              <span
                class="absolute right-1 -translate-y-1/2 font-mono text-[0.55rem] tabular-nums text-muted-foreground"
                style={{ top: `${t.top}%` }}
              >
                {axisLabel(t.v)}
              </span>
            )}
          </For>
        </div>

        <div class="relative min-h-0 flex-1">
          <svg
            class="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Gridlines at each tick */}
            <For each={chart().ticks}>
              {(t) => (
                <line
                  x1="0"
                  x2="100"
                  y1={t.top}
                  y2={t.top}
                  class="stroke-border"
                  stroke-width="1"
                  vector-effect="non-scaling-stroke"
                />
              )}
            </For>
            {/* Stacked bands (drawn bottom layer first) */}
            <For each={chart().bands}>
              {(b) => (
                <>
                  <path d={b.area} class={FILL[b.color]} fill-opacity="0.5" />
                  <path
                    d={b.line}
                    class={STROKE[b.color]}
                    fill="none"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                    vector-effect="non-scaling-stroke"
                  />
                </>
              )}
            </For>
          </svg>
        </div>
      </div>

      {/* Week axis: first, middle, last to stay uncluttered. */}
      <div class="mt-1 flex justify-between pl-9 text-[0.6rem] tabular-nums text-muted-foreground">
        <span>{history().labels[0]}</span>
        <span>{history().labels[Math.floor(history().labels.length / 2)]}</span>
        <span>{history().labels[history().labels.length - 1]}</span>
      </div>
    </Card>
  );
}
