/**
 * Tiny deterministic PRNG toolkit.
 *
 * The whole board is reproducible from a fixed seed, so we never touch
 * Math.random(). `hashSeed` turns arbitrary strings/numbers into a 32-bit seed,
 * and `mulberry32` is a fast, well-distributed PRNG good enough for plausible
 * fake data. `rng()` bundles the common helpers we reach for.
 */

/** xmur3-style string hash → 32-bit unsigned integer. */
export function hashSeed(...parts: (string | number)[]): number {
  const str = parts.join("|");
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 PRNG: returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** float in [min, max) */
  range(min: number, max: number): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** uniformly pick an element */
  pick<T>(arr: readonly T[]): T;
  /** true with probability p */
  chance(p: number): boolean;
}

/** Construct an Rng seeded from the given parts. */
export function rng(...seedParts: (string | number)[]): Rng {
  const f = mulberry32(hashSeed(...seedParts));
  const api: Rng = {
    next: f,
    range: (min, max) => min + f() * (max - min),
    int: (min, max) => Math.floor(min + f() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(f() * arr.length)],
    chance: (p) => f() < p,
  };
  return api;
}
