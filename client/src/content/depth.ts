// The core pacing model for the whole experience. Every other module reads
// depth from here so the "top → bottom takes hours, and the shift is barely
// noticeable" feeling stays consistent everywhere (theme, audio, portal
// frequency, word banks).

/**
 * Maps a feed item index to a continuous depth progress value in [0, 1).
 * Uses an exponential approach so early scrolling (top layers) moves through
 * depth-space quickly relative to how far you've *already* come, while deep
 * scrolling asymptotically approaches — but never quite reaches — total
 * darkness. At a relaxed ~4s/item pace this reaches ~90% depth around the
 * 3-4 hour mark, matching the brief's "takes hours" pacing.
 */
const DEPTH_TIME_CONSTANT = 1500;

export function depthProgress(itemIndex: number): number {
  return 1 - Math.exp(-Math.max(0, itemIndex) / DEPTH_TIME_CONSTANT);
}

export type Tone = 'light' | 'mid' | 'deep';

/** Triangular blend weights for each tone band at a given depth progress. */
export function toneWeights(t: number): Record<Tone, number> {
  const light = clamp(1 - t / 0.5, 0, 1);
  const deep = clamp((t - 0.5) / 0.5, 0, 1);
  const mid = clamp(1 - light - deep, 0, 1);
  return { light, mid, deep };
}

/** The single dominant tone at a depth, used where a discrete choice is needed. */
export function dominantTone(t: number): Tone {
  const w = toneWeights(t);
  if (w.light >= w.mid && w.light >= w.deep) return 'light';
  if (w.deep >= w.mid && w.deep >= w.light) return 'deep';
  return 'mid';
}

/**
 * Portals get rarer with depth: frequent and inviting near the top, sparse
 * and spaced-out once things turn strange. Never fully disappears — there's
 * always *something* to find if you keep going.
 */
export function portalProbability(itemIndex: number): number {
  const p = 0.3 * Math.exp(-Math.max(0, itemIndex) / 420) + 0.025;
  return clamp(p, 0.025, 0.3);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lerpColor(hexA: string, hexB: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  return rgbToHex(lerp(ar, br, t), lerp(ag, bg, t), lerp(ab, bb, t));
}

/** Blend across three stops (light -> mid -> deep): pairwise lerp split at the midpoint. */
export function blendAcrossTones(t: number, colors: Record<Tone, string>): string {
  if (t <= 0.5) {
    return lerpColor(colors.light, colors.mid, t / 0.5);
  }
  return lerpColor(colors.mid, colors.deep, (t - 0.5) / 0.5);
}
