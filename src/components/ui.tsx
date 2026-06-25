import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { LineStatus, EventKind } from "~/lib/sim/types.ts";

/** Tailwind text-color class for a line/event status. */
export function statusColor(status: LineStatus | EventKind): string {
  switch (status) {
    case "running":
      return "text-running";
    case "setup":
      return "text-setup";
    case "maintenance":
      return "text-maintenance";
    case "warn":
      return "text-setup";
    case "idle":
      return "text-idle";
    default:
      return "text-muted-foreground";
  }
}

/** Tailwind bg-color class for the same. */
export function statusBg(status: LineStatus | EventKind): string {
  switch (status) {
    case "running":
      return "bg-running";
    case "setup":
      return "bg-setup";
    case "maintenance":
      return "bg-maintenance";
    case "warn":
      return "bg-setup";
    case "idle":
      return "bg-idle";
    default:
      return "bg-muted-foreground";
  }
}

export function statusLabel(status: LineStatus): string {
  switch (status) {
    case "running":
      return "Running";
    case "setup":
      return "Make-ready";
    case "maintenance":
      return "Maintenance";
    case "idle":
      return "Idle";
  }
}

/** A small status dot; pulses when the line is actively running. */
export function StatusDot(props: { status: LineStatus | EventKind; pulse?: boolean }) {
  return (
    <span
      class={`inline-block h-2 w-2 shrink-0 rounded-full ${statusBg(props.status)} ${
        props.pulse ? "pulse-dot" : ""
      }`}
    />
  );
}

/** A panel surface. The header row stays fixed; children fill the rest. */
export function Card(props: {
  title?: string;
  accessory?: JSX.Element;
  class?: string;
  bodyClass?: string;
  children: JSX.Element;
}) {
  return (
    <section
      class={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card ${
        props.class ?? ""
      }`}
    >
      <Show when={props.title}>
        <header class="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {props.title}
          </h2>
          <Show when={props.accessory}>{props.accessory}</Show>
        </header>
      </Show>
      <div class={`min-h-0 flex-1 ${props.bodyClass ?? "px-4 pb-3"}`}>{props.children}</div>
    </section>
  );
}
