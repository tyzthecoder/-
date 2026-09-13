import type { ShapeSpec } from './portalTemplates';

interface Point {
  x: number;
  y: number;
}

function polygonPoints(spec: Pick<ShapeSpec, 'sides' | 'wobble'>, rng: () => number, cx: number, cy: number, r: number): Point[] {
  const points: Point[] = [];
  const sides = Math.max(3, spec.sides);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const wobbleAmount = 1 + (rng() * 2 - 1) * spec.wobble;
    points.push({
      x: cx + Math.cos(angle) * r * wobbleAmount,
      y: cy + Math.sin(angle) * r * wobbleAmount,
    });
  }
  return points;
}

function straightPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

/** Smooth closed curve through points using quadratic beziers via midpoints (cheap Catmull-Rom-ish blob). */
function smoothPath(points: Point[]): string {
  if (points.length < 3) return straightPath(points);
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let d = `M ${mid(points[points.length - 1], points[0]).x.toFixed(2)} ${mid(points[points.length - 1], points[0]).y.toFixed(2)} `;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const m = mid(current, next);
    d += `Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${m.x.toFixed(2)} ${m.y.toFixed(2)} `;
  }
  return d + 'Z';
}

/** Builds an SVG path (or shape descriptor) for a 100x100 viewBox, centered. */
export function buildShapePath(spec: ShapeSpec, rng: () => number): { kind: 'path' | 'ring'; d?: string; innerR?: number; outerR?: number } {
  const cx = 50;
  const cy = 50;
  const r = 32 * spec.scale;

  switch (spec.kind) {
    case 'polygon':
      return { kind: 'path', d: straightPath(polygonPoints(spec, rng, cx, cy, r)) };
    case 'blob':
      return { kind: 'path', d: smoothPath(polygonPoints({ ...spec, sides: Math.max(5, spec.sides) }, rng, cx, cy, r)) };
    case 'shard': {
      const points = polygonPoints({ sides: 3, wobble: spec.wobble }, rng, cx, cy, r * 1.3);
      return { kind: 'path', d: straightPath(points) };
    }
    case 'ring':
    default:
      return { kind: 'ring', innerR: r * 0.55, outerR: r };
  }
}
