import { blendAcrossTones, clamp, lerp, type Tone } from './depth';

export interface ThemeTokens {
  bgTop: string;
  bgBottom: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accent2: string;
  border: string;
  shadow: string;
  glowPx: number;
  vignette: number; // 0..1 opacity of a subtle deep-scroll vignette
}

// Plain hex tokens — safe to blend with the shared hex lerp.
const HEX_STOPS: Record<
  'bgTop' | 'bgBottom' | 'surface' | 'surfaceAlt' | 'ink' | 'inkMuted' | 'accent' | 'accent2',
  Record<Tone, string>
> = {
  bgTop: { light: '#fef6e4', mid: '#c9c2d9', deep: '#0a0a0f' },
  bgBottom: { light: '#ffe8f0', mid: '#8f8aa8', deep: '#050507' },
  surface: { light: '#ffffff', mid: '#e7e4ee', deep: '#141319' },
  surfaceAlt: { light: '#fff9f0', mid: '#d8d3e6', deep: '#1b1a22' },
  ink: { light: '#1b1b1f', mid: '#232028', deep: '#e9e6f0' },
  inkMuted: { light: '#55555f', mid: '#5c5568', deep: '#918da3' },
  accent: { light: '#ff7a59', mid: '#a86bd6', deep: '#8b1e3f' },
  accent2: { light: '#6c5ce7', mid: '#5e4ba0', deep: '#3a1f5c' },
};

// rgba tokens — interpolated channel-by-channel (including alpha) since they
// carry transparency that a hex string can't represent.
const RGBA_STOPS: Record<'border' | 'shadow', Record<Tone, [number, number, number, number]>> = {
  border: {
    light: [27, 27, 31, 0.08],
    mid: [35, 32, 40, 0.14],
    deep: [233, 230, 240, 0.08],
  },
  shadow: {
    light: [30, 20, 10, 0.12],
    mid: [15, 10, 25, 0.28],
    deep: [0, 0, 0, 0.6],
  },
};

function blendRgba(t: number, stops: Record<Tone, [number, number, number, number]>): string {
  const [la, lb] = t <= 0.5 ? [stops.light, stops.mid] : [stops.mid, stops.deep];
  const local = t <= 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const [r, g, b, a] = [0, 1, 2, 3].map((i) => lerp(la[i], lb[i], local));
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

export function computeTheme(t: number): ThemeTokens {
  const clamped = clamp(t, 0, 1);
  const hex = Object.fromEntries(
    (Object.keys(HEX_STOPS) as Array<keyof typeof HEX_STOPS>).map((key) => [
      key,
      blendAcrossTones(clamped, HEX_STOPS[key]),
    ])
  ) as Record<keyof typeof HEX_STOPS, string>;

  return {
    ...hex,
    border: blendRgba(clamped, RGBA_STOPS.border),
    shadow: blendRgba(clamped, RGBA_STOPS.shadow),
    glowPx: lerp(0, 22, clamped),
    vignette: clamp((clamped - 0.55) / 0.45, 0, 1) * 0.5,
  };
}

export function applyThemeToDocument(theme: ThemeTokens) {
  const root = document.documentElement.style;
  root.setProperty('--signal-bg-top', theme.bgTop);
  root.setProperty('--signal-bg-bottom', theme.bgBottom);
  root.setProperty('--signal-surface', theme.surface);
  root.setProperty('--signal-surface-alt', theme.surfaceAlt);
  root.setProperty('--signal-ink', theme.ink);
  root.setProperty('--signal-ink-muted', theme.inkMuted);
  root.setProperty('--signal-accent', theme.accent);
  root.setProperty('--signal-accent-2', theme.accent2);
  root.setProperty('--signal-border', theme.border);
  root.setProperty('--signal-shadow', theme.shadow);
  root.setProperty('--signal-glow', `${theme.glowPx}px`);
  root.setProperty('--signal-vignette', String(theme.vignette));
}
