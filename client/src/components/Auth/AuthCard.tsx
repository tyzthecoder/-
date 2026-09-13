import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-3xl border p-8 shadow-xl"
        style={{ background: 'var(--signal-surface)', borderColor: 'var(--signal-border)' }}
      >
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--signal-ink)' }}>
          {title}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--signal-ink-muted)' }}>
          {subtitle}
        </p>
        <div className="mt-6">{children}</div>
      </motion.div>
    </div>
  );
}
