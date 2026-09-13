import { useAppStore } from '../../store/useAppStore';

export function ReducedMotionButton() {
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);

  return (
    <button
      type="button"
      onClick={() => setReducedMotion(!reducedMotion)}
      aria-pressed={reducedMotion}
      aria-label={reducedMotion ? 'Enable animations' : 'Reduce animations'}
      title={reducedMotion ? 'Animations reduced' : 'Reduce animations'}
      className="flex h-10 w-10 items-center justify-center rounded-full border text-sm"
      style={{
        borderColor: 'var(--signal-border)',
        background: reducedMotion ? 'var(--signal-accent)' : 'var(--signal-surface)',
        color: reducedMotion ? 'white' : 'var(--signal-ink)',
      }}
    >
      ◎
    </button>
  );
}
