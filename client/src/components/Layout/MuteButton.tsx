import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

export function MuteButton() {
  const muted = useAppStore((s) => s.muted);
  const toggleMuted = useAppStore((s) => s.toggleMuted);

  return (
    <motion.button
      type="button"
      onClick={toggleMuted}
      whileTap={{ scale: 0.9 }}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute background audio' : 'Mute background audio'}
      className="flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-colors"
      style={{
        borderColor: 'var(--signal-border)',
        background: 'var(--signal-surface)',
        color: 'var(--signal-ink)',
      }}
    >
      {muted ? '🔇' : '🔊'}
    </motion.button>
  );
}
