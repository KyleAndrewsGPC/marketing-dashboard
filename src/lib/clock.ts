import { createSignal, onCleanup } from "solid-js";

/**
 * A 1 Hz clock signal. The entire board is a pure function of `(seed, now)`,
 * so this single ticking timestamp is the only thing that needs to change for
 * the whole UI to evolve. We re-align to the wall-clock second boundary on each
 * tick to avoid drift over the long unattended runs this board is built for.
 */
export function createClock() {
  const [now, setNow] = createSignal(Date.now());

  let timer: ReturnType<typeof setTimeout>;

  const schedule = () => {
    const ms = Date.now();
    // Delay until the next whole second so updates land ~on the second.
    const delay = 1000 - (ms % 1000);
    timer = setTimeout(() => {
      setNow(Date.now());
      schedule();
    }, delay);
  };

  schedule();
  onCleanup(() => clearTimeout(timer));

  return now;
}
