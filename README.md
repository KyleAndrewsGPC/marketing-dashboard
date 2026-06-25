# Production Control Center — Demo Board

A **simulated, real-time production board** built as a showcase/demo. It runs unattended on a
display (e.g. a Raspberry Pi) while visitors tour the software-engineering / data-processing area,
giving them a realistic sense of the kind of work and the **typical volumes of shelf/price strips
and shelf/POP signs** a commercial retail-print operation processes and prints.

> **All data is fake.** The board is driven entirely by a *seeded deterministic simulation* — no real
> customers, jobs, pricing, schedules, or capacity are ever shown or stored. The numbers are
> plausible and evolve live, but they are generated from a fixed random seed and the wall clock.

---

## Goals

- **Looks real, exposes nothing.** Realistic-feeling floor status with zero proprietary data.
- **Self-running.** Boots, runs forever, recovers across reboots — no operator needed.
- **Always alive.** The board *evolves* during a tour: counters tick up, progress bars advance,
  jobs flow through stages, the activity feed updates.

## Hard constraints

These are non-negotiable and shape every decision below:

| Constraint | Implication |
|---|---|
| **Single viewport** | Entire board fits one screen. `100vh` grid, `overflow: hidden`, **no scrolling — anywhere.** Designed for a 1080p (16:9) landscape display. |
| **Zero interaction** | No buttons, no links, no hover-only info, no keyboard/mouse. The Pi typically runs headless in kiosk mode. |
| **Fully offline** | Must work with no network. A service worker precaches all assets (PWA). |
| **Generic / safe** | No company name (generic **"Production Control Center"** label), no real customer names, pricing, or capacity. |

## Tech stack

- **[SolidJS](https://www.solidjs.com/)** — reactive UI; a 1 Hz clock signal drives all derived state.
- **[Tailwind CSS](https://tailwindcss.com/)** — styling, **shadcn-inspired** dark design tokens
  (neutral palette, subtle borders, card surfaces, muted foreground).
- **[Vite](https://vitejs.dev/)** — dev server + static production build.
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)** — service worker / offline precache.

No backend. The build output is a folder of static files.

## Design

- **Dark, clean, shadcn-inspired.** High-contrast numerals, tabular figures, restrained accent
  colors, soft borders and card surfaces. Calm enough to live on a wall for hours.
- Status color language: **running** (green), **setup/make-ready** (amber), **maintenance** (blue),
  **idle** (muted).

## What's on the board

A fixed single-screen layout (no scroll):

- **Header** — generic title, live clock/date, current shift, "all systems operational" status.
- **KPI row** — headline daily totals: price strips, shelf/POP signs, press impressions,
  data records processed, on-time %, active lines.
- **Production lines** — each press/finishing line with current work order (generic customer +
  program), live progress bar, run speed, and ETA.
- **Throughput chart** — output-by-hour for the current production day, filling as the day proceeds.
- **Data pipeline** — the data-processing funnel (Ingest → Composition → Preflight → Proofing →
  Release), records/min, and exception rate — the "software/data" side of the floor.
- **Activity feed** — a live stream of job and pipeline events.
- **Ticker** — week-to-date totals and ambient stats.

## How the simulation works

- A small **seeded PRNG** (fixed seed) makes the data **deterministic and reproducible**.
- The board state is a **pure function of `(seed, current time)`** — given a timestamp, it produces
  the full snapshot (line states, cumulative counters, feed events, chart).
- A diurnal/shift curve shapes throughput across the day; per-day variation is seeded so each day
  differs but is repeatable. Cumulative counters reset at midnight (a new production day).
- Because everything derives from the clock, the board **self-corrects across reboots** and rolls
  over at midnight with no persisted state.

## Running

```bash
npm install
npm run dev      # local development
npm run build    # static production build → dist/
npm run preview  # serve the production build locally
```

### On the Raspberry Pi (kiosk)

1. `npm run build` and serve `dist/` from any static file server (or open offline via the PWA).
2. Launch a browser in **kiosk / fullscreen** mode pointed at the board.
3. No input devices required; the board runs and updates on its own.

_(Detailed Pi/kiosk setup steps will be added once the build is in place.)_
