import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveLeaderboard } from '../hooks/useLiveLeaderboard';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function LeaderboardPage() {
  const [tab, setTab] = useState<'dive-time' | 'depth'>('dive-time');
  const { rows, loading } = useLiveLeaderboard(tab);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--signal-ink)' }}>
        Leaderboard
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--signal-ink-muted)' }}>
        Updates live as divers keep scrolling.
      </p>

      <div className="mt-6 flex gap-2">
        {(
          [
            ['dive-time', 'Total dive time'],
            ['depth', 'Deepest reached'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            style={
              tab === key
                ? { background: 'var(--signal-accent)', color: 'white' }
                : { background: 'var(--signal-surface-alt)', color: 'var(--signal-ink-muted)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {loading && rows.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--signal-ink-muted)' }}>
            Loading…
          </p>
        )}
        {rows.map((row, i) => (
          <motion.div
            layout
            key={row.username}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between rounded-2xl border px-4 py-3"
            style={{ borderColor: 'var(--signal-border)', background: 'var(--signal-surface)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: i < 3 ? 'var(--signal-accent)' : 'var(--signal-surface-alt)',
                  color: i < 3 ? 'white' : 'var(--signal-ink-muted)',
                }}
              >
                {i + 1}
              </span>
              <span className="font-semibold" style={{ color: 'var(--signal-ink)' }}>
                {row.username}
              </span>
            </div>
            <span className="font-display text-sm font-bold" style={{ color: 'var(--signal-accent)' }}>
              {tab === 'dive-time' ? formatDuration(row.total_seconds) : `#${row.max_depth_index}`}
            </span>
          </motion.div>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-sm italic" style={{ color: 'var(--signal-ink-muted)' }}>
            Nobody's on the board yet. Start scrolling.
          </p>
        )}
      </div>
    </div>
  );
}
