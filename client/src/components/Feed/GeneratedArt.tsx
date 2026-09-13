import { useMemo } from 'react';
import type { ShapeSpec } from '../../content/portalTemplates';
import type { ArtSpec } from '../../content/feedGenerator';
import type { Tone } from '../../content/depth';
import { buildShapePath } from '../../content/shapePath';
import { mulberry32 } from '../../rng/seededRandom';

const GRADIENT_IDS = { light: 'grad-light', mid: 'grad-mid', deep: 'grad-deep' };

function ToneDefs() {
  return (
    <defs>
      <linearGradient id={GRADIENT_IDS.light} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--signal-accent)" />
        <stop offset="100%" stopColor="var(--signal-accent-2)" />
      </linearGradient>
      <linearGradient id={GRADIENT_IDS.mid} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--signal-accent-2)" />
        <stop offset="100%" stopColor="var(--signal-ink-muted)" />
      </linearGradient>
      <linearGradient id={GRADIENT_IDS.deep} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--signal-accent)" />
        <stop offset="100%" stopColor="#000000" />
      </linearGradient>
    </defs>
  );
}

interface PortalArtProps {
  shape: ShapeSpec;
  tone: Tone;
  templateId: string;
  size?: number;
  isUltra?: boolean;
}

export function PortalArt({ shape, tone, templateId, size = 96, isUltra }: PortalArtProps) {
  const rng = useMemo(() => mulberry32(hashSeed(templateId)), [templateId]);
  const built = useMemo(() => buildShapePath(shape, rng), [shape, rng]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        filter: `hue-rotate(${shape.hueShift}deg) drop-shadow(0 0 var(--signal-glow) var(--signal-accent))`,
        transform: `rotate(${shape.rotation}deg)`,
        transition: 'filter 1.2s ease',
      }}
      aria-hidden
    >
      <ToneDefs />
      {built.kind === 'ring' ? (
        <circle
          cx={50}
          cy={50}
          r={((built.innerR ?? 10) + (built.outerR ?? 30)) / 2}
          fill="none"
          stroke={`url(#${GRADIENT_IDS[tone]})`}
          strokeWidth={(built.outerR ?? 30) - (built.innerR ?? 10)}
          strokeDasharray={isUltra ? '4 3' : undefined}
          opacity={0.9}
        />
      ) : (
        <path d={built.d} fill={`url(#${GRADIENT_IDS[tone]})`} opacity={0.92} />
      )}
      {isUltra && (
        <circle cx={50} cy={50} r={44} fill="none" stroke="var(--signal-accent)" strokeOpacity={0.35} strokeWidth={1.5} />
      )}
    </svg>
  );
}

interface FillerArtProps {
  art: ArtSpec;
  tone: Tone;
  size?: number;
}

export function FillerArt({ art, tone, size = 64 }: FillerArtProps) {
  const rng = useMemo(() => mulberry32(art.seed), [art.seed]);
  const shapes = useMemo(() => {
    const list: ShapeSpec[] = [];
    for (let i = 0; i < art.shapeCount; i++) {
      list.push({
        kind: (['polygon', 'blob', 'ring', 'shard'] as const)[Math.floor(rng() * 4)],
        sides: 3 + Math.floor(rng() * 5),
        rotation: rng() * 360,
        wobble: 0.1 + rng() * 0.25,
        hueShift: (rng() * 2 - 1) * 20,
        scale: 0.3 + rng() * 0.5,
      });
    }
    return list;
  }, [art, rng]);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ opacity: 0.85 }}>
      <ToneDefs />
      {shapes.map((s, i) => {
        const built = buildShapePath(s, rng);
        const offsetX = (i - art.shapeCount / 2) * 6;
        return (
          <g key={i} transform={`translate(${offsetX}, 0) rotate(${s.rotation} 50 50)`} opacity={0.55 + i * 0.05}>
            {built.kind === 'ring' ? (
              <circle
                cx={50}
                cy={50}
                r={((built.innerR ?? 6) + (built.outerR ?? 16)) / 2}
                fill="none"
                stroke={`url(#${GRADIENT_IDS[tone]})`}
                strokeWidth={(built.outerR ?? 16) - (built.innerR ?? 6)}
              />
            ) : (
              <path d={built.d} fill={`url(#${GRADIENT_IDS[tone]})`} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}
