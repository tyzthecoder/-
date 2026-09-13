import type { Tone } from './depth';
import { seededRng, chance, rangeInt, range } from '../rng/seededRandom';
import { titleFor, blurbFor } from './wordbanks';

// Every portal a user can find comes from a shared, finite pool per tone.
// Because the pool — and every template's content — is a pure function of
// its templateId (never the viewing user's seed), two different users can
// occasionally land on the *same* template at different depths. That
// collision is the "rare coincidence" the brief asks for, and it's also
// what makes collective rarity tracking on the server meaningful: the
// server only ever needs to know a templateId string, not any content.
export const POOL_SIZE: Record<Tone, number> = {
  light: 3200,
  mid: 2600,
  deep: 2000,
};

// The top slice of each pool's index range is reserved for "ultra" templates
// — visually distinct, and drawn far less often — so some portals are
// inherently scarce even before any community discovery data exists.
const ULTRA_FRACTION = 0.02;

export function isUltraIndex(tone: Tone, index: number): boolean {
  return index >= Math.floor(POOL_SIZE[tone] * (1 - ULTRA_FRACTION));
}

export function makeTemplateId(tone: Tone, index: number): string {
  return `t-${tone}-${index}`;
}

export function parseTemplateId(templateId: string): { tone: Tone; index: number } | null {
  const m = /^t-(light|mid|deep)-(\d+)$/.exec(templateId);
  if (!m) return null;
  return { tone: m[1] as Tone, index: Number(m[2]) };
}

export interface ShapeSpec {
  kind: 'blob' | 'polygon' | 'ring' | 'shard';
  sides: number;
  rotation: number;
  wobble: number;
  hueShift: number;
  scale: number;
}

export interface PortalTemplate {
  templateId: string;
  tone: Tone;
  index: number;
  isUltra: boolean;
  title: string;
  blurb: string;
  miniExperience: string;
  shape: ShapeSpec;
}

const MINI_EXPERIENCE_LINES: Record<Tone, string[]> = {
  light: [
    'A tiny burst of confetti falls upward for exactly two seconds, then remembers gravity.',
    'The card flips over. On the back, someone drew a smiley face in the year this was made.',
    'A jingle plays that you will hum later without remembering where you heard it.',
    'A little window opens showing a beach that may or may not exist.',
  ],
  mid: [
    'The screen flickers once. For a moment you see a reflection that is not quite yours.',
    'A dial tone hums, then resolves into three notes you almost recognize.',
    'Static clears into a photograph of a place that looks familiar and isn’t.',
    'A door creaks open onto a hallway identical to the one you just scrolled past.',
  ],
  deep: [
    'Everything goes quiet for a second longer than feels natural, then resumes.',
    'A single word appears and fades before you can be sure you read it correctly.',
    'The shape on screen turns to face you. It was not facing you a moment ago.',
    'Something below acknowledges that you opened this. You are not sure how you know that.',
  ],
};

export function buildPortalTemplate(templateId: string): PortalTemplate | null {
  const parsed = parseTemplateId(templateId);
  if (!parsed) return null;
  const { tone, index } = parsed;
  const rng = seededRng('template', templateId);
  const isUltra = isUltraIndex(tone, index);

  const shapeKinds: ShapeSpec['kind'][] = ['blob', 'polygon', 'ring', 'shard'];
  const shape: ShapeSpec = {
    kind: shapeKinds[Math.floor(rng() * shapeKinds.length)],
    sides: rangeInt(rng, 3, 8),
    rotation: range(rng, 0, 360),
    wobble: range(rng, 0.05, isUltra ? 0.55 : 0.3),
    hueShift: range(rng, -18, 18),
    scale: isUltra ? range(rng, 1.15, 1.4) : range(rng, 0.85, 1.1),
  };

  const miniLines = MINI_EXPERIENCE_LINES[tone];
  const miniExperience = miniLines[Math.floor(rng() * miniLines.length)];

  return {
    templateId,
    tone,
    index,
    isUltra,
    title: titleFor(tone, rng),
    blurb: blurbFor(tone, rng),
    miniExperience,
    shape,
  };
}

/**
 * Chooses which template a *specific user* encounters at a given feed
 * position. Ultra templates are intentionally rare draws (not just a rare
 * label) — most rolls land in the common range.
 */
export function pickTemplateIndexForUser(tone: Tone, itemRng: () => number): number {
  const poolSize = POOL_SIZE[tone];
  const ultraStart = Math.floor(poolSize * (1 - ULTRA_FRACTION));
  if (chance(itemRng, 0.015)) {
    return rangeInt(itemRng, ultraStart, poolSize - 1);
  }
  return rangeInt(itemRng, 0, ultraStart - 1);
}
