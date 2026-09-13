import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function BadgeUnlockToasts() {
  const toasts = useAppStore((s) => s.badgeToasts);
  const dismiss = useAppStore((s) => s.dismissBadgeToast);

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-8">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} id={toast.id} label={toast.rarity.label} color={toast.rarity.color} onDone={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  id,
  label,
  color,
  onDone,
}: {
  id: string;
  label: string;
  color: string;
  onDone: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), 4200);
    return () => clearTimeout(t);
  }, [id, onDone]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl"
      style={{
        background: 'var(--signal-surface)',
        borderColor: color,
        boxShadow: `0 0 24px ${color}55`,
      }}
    >
      <span className="text-2xl">✦</span>
      <div>
        <p className="font-display text-sm font-bold" style={{ color }}>
          {label} discovery!
        </p>
        <p className="text-xs" style={{ color: 'var(--signal-ink-muted)' }}>
          A new badge was added to your profile.
        </p>
      </div>
    </motion.div>
  );
}
