import { seededRng, chance, pick } from '../rng/seededRandom';
import { depthProgress, portalProbability, toneWeights, type Tone } from './depth';
import { makeTemplateId, pickTemplateIndexForUser } from './portalTemplates';
import { whisperFor } from './wordbanks';

export interface ArtSpec {
  shapeCount: number;
  seed: number;
  paletteJitter: number;
}

export interface FillerItem {
  kind: 'filler';
  index: number;
  tone: Tone;
  depth: number;
  text: string;
  art: ArtSpec;
}

export interface PortalItem {
  kind: 'portal';
  index: number;
  tone: Tone;
  depth: number;
  templateId: string;
}

export type FeedItem = FillerItem | PortalItem;

function chooseTone(depth: number, rng: () => number): Tone {
  const weights = toneWeights(depth);
  const roll = rng();
  if (roll < weights.light) return 'light';
  if (roll < weights.light + weights.mid) return 'mid';
  return 'deep';
}

export function generateFeedItem(userSeed: string, index: number): FeedItem {
  const depth = depthProgress(index);
  const rng = seededRng(userSeed, index);
  const tone = chooseTone(depth, rng);

  if (chance(rng, portalProbability(index))) {
    const templateIndex = pickTemplateIndexForUser(tone, rng);
    return {
      kind: 'portal',
      index,
      tone,
      depth,
      templateId: makeTemplateId(tone, templateIndex),
    };
  }

  return {
    kind: 'filler',
    index,
    tone,
    depth,
    text: whisperFor(tone, rng),
    art: {
      shapeCount: 2 + Math.floor(rng() * 4),
      seed: Math.floor(rng() * 1_000_000),
      paletteJitter: rng(),
    },
  };
}

/** Convenience for generating a contiguous window — used by the virtualized feed. */
export function generateFeedWindow(userSeed: string, start: number, count: number): FeedItem[] {
  const items: FeedItem[] = [];
  for (let i = start; i < start + count; i++) {
    items.push(generateFeedItem(userSeed, i));
  }
  return items;
}

// Re-exported so components don't need to reach into rng/ directly for the
// one-off "pick a random flavor accent" case (e.g. card corner decoration).
export { pick };
