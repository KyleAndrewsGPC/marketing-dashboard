import { createMemo, type Component } from "solid-js";
import { createClock } from "~/lib/clock.ts";
import { snapshot } from "~/lib/sim/index.ts";
import { Header } from "~/components/Header.tsx";
import { KpiRow } from "~/components/KpiRow.tsx";
import { ProductionLines } from "~/components/ProductionLines.tsx";
import { ThroughputChart } from "~/components/ThroughputChart.tsx";
import { DataPipeline } from "~/components/DataPipeline.tsx";
import { ActivityFeed } from "~/components/ActivityFeed.tsx";
import { Ticker } from "~/components/Ticker.tsx";

/**
 * Single-viewport board. The 1 Hz clock drives a single `snapshot` memo; every
 * panel reads from it. `100vh` grid, nothing scrolls, no interaction.
 */
const App: Component = () => {
  const now = createClock();
  const snap = createMemo(() => snapshot(now()));

  return (
    <div class="grid h-screen w-screen grid-rows-[auto_auto_1fr_auto] gap-3 overflow-hidden p-3">
      <Header now={now} snap={snap} />
      <KpiRow snap={snap} />

      <main class="grid min-h-0 grid-cols-[3fr_2fr] gap-3">
        {/* Left: production lines over throughput chart */}
        <div class="grid min-h-0 grid-rows-[1fr_minmax(0,38%)] gap-3">
          <ProductionLines snap={snap} />
          <ThroughputChart snap={snap} />
        </div>

        {/* Right: data pipeline over activity feed */}
        <div class="grid min-h-0 grid-rows-[auto_1fr] gap-3">
          <DataPipeline snap={snap} />
          <ActivityFeed now={now} snap={snap} />
        </div>
      </main>

      <Ticker snap={snap} />
    </div>
  );
};

export default App;
