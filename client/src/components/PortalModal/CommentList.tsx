import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { CommentDTO } from '../../api/client';
import { reportComment } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

function timeAgo(raw: string): string {
  // SQLite's datetime('now') yields "YYYY-MM-DD HH:MM:SS" (UTC, no zone marker);
  // live socket pushes use a real ISO string (already has T + Z/offset).
  const iso = /[zZ]|[+-]\d\d:\d\d$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function CommentList({ comments, loading }: { comments: CommentDTO[]; loading: boolean }) {
  const user = useAppStore((s) => s.user);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());

  async function handleReport(id: number) {
    if (!user || reportedIds.has(id)) return;
    setReportedIds((prev) => new Set(prev).add(id));
    try {
      await reportComment(id);
    } catch {
      // Non-critical — leave it marked reported locally either way.
    }
  }

  if (loading) {
    return <p className="py-6 text-center text-sm" style={{ color: 'var(--signal-ink-muted)' }}>Loading comments…</p>;
  }

  if (comments.length === 0) {
    return (
      <p className="py-6 text-center text-sm italic" style={{ color: 'var(--signal-ink-muted)' }}>
        No one has spoken here yet. Be the first.
      </p>
    );
  }

  return (
    <ul className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {comments.map((c) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--signal-border)', background: 'var(--signal-surface-alt)' }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-semibold" style={{ color: 'var(--signal-ink)' }}>
                {c.username}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--signal-ink-muted)' }}>
                  {timeAgo(c.created_at)}
                </span>
                {user && (
                  <button
                    type="button"
                    onClick={() => handleReport(c.id)}
                    disabled={reportedIds.has(c.id)}
                    className="text-xs underline decoration-dotted disabled:no-underline disabled:opacity-50"
                    style={{ color: 'var(--signal-ink-muted)' }}
                    title="Report this comment"
                  >
                    {reportedIds.has(c.id) ? 'reported' : 'report'}
                  </button>
                )}
              </div>
            </div>
            <p style={{ color: 'var(--signal-ink)' }}>{c.body}</p>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
