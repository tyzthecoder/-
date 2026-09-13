import { dominantTone } from '../../content/depth';

const TONE_LABEL: Record<string, string> = {
  light: 'surface',
  mid: 'drifting',
  deep: 'deep signal',
};

export function DepthGauge({ depth }: { depth: number }) {
  const percent = Math.round(depth * 100);
  const tone = dominantTone(depth);

  return (
    <div className="hidden items-center gap-2 text-xs font-medium sm:flex" style={{ color: 'var(--signal-ink-muted)' }}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'var(--signal-border)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%`, background: 'var(--signal-accent)' }}
        />
      </div>
      <span className="font-display uppercase tracking-wider">{TONE_LABEL[tone]}</span>
    </div>
  );
}
