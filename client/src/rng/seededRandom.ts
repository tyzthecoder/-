// Deterministic PRNG utilities. Every piece of "random" content in the feed
// is actually a pure function of (userSeed, itemIndex) — same inputs always
// produce the same output. That's what makes a user's feed stable across
// reloads while still being unique to them, and what lets two different
// users occasionally land on the exact same portal template ("rare
// coincidences" per the brief) without any server coordination.

/** cyrb53 string hash — fast, decent distribution, good enough for content seeding (not crypto). */
export function hashString(str: string): number {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** mulberry32 — tiny, fast, seedable PRNG. Returns a generator function producing floats in [0, 1). */
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

/** Build a PRNG deterministically from any number of string/number parts. */
export function seededRng(...parts: Array<string | number>): () => number {
  const seed = hashString(parts.join(':'));
  return mulberry32(seed);
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function rangeInt(rng: () => number, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

export function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}
