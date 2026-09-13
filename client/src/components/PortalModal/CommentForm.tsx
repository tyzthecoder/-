import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { ApiError } from '../../api/client';

const MAX_LENGTH = 500;

export function CommentForm({
  onSubmit,
}: {
  onSubmit: (body: string) => Promise<{ commentsRemaining: number } | void>;
}) {
  const user = useAppStore((s) => s.user);
  const commentsUsed = useAppStore((s) => s.commentsUsedThisMonth);
  const commentQuota = useAppStore((s) => s.commentQuota);
  const setCommentsUsed = useAppStore((s) => s.setCommentsUsed);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, commentQuota - commentsUsed);

  if (!user) {
    return (
      <p className="rounded-xl border border-dashed px-3 py-3 text-center text-sm" style={{ borderColor: 'var(--signal-border)', color: 'var(--signal-ink-muted)' }}>
        <Link to="/login" className="font-semibold underline" style={{ color: 'var(--signal-accent)' }}>
          Log in
        </Link>{' '}
        to leave a comment.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(value.trim());
      setValue('');
      setCommentsUsed(commentsUsed + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post that comment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (remaining <= 0) {
    return (
      <p className="rounded-xl border px-3 py-3 text-center text-sm" style={{ borderColor: 'var(--signal-border)', color: 'var(--signal-ink-muted)' }}>
        You've used all {commentQuota} of your comments this month. They refresh next month — choose wisely.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
        placeholder="Say something worth one of your comments…"
        rows={2}
        maxLength={MAX_LENGTH}
        className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
        style={{
          borderColor: 'var(--signal-border)',
          background: 'var(--signal-surface)',
          color: 'var(--signal-ink)',
        }}
      />
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--signal-ink-muted)' }}>
        <span>
          {remaining} comment{remaining === 1 ? '' : 's'} left this month
        </span>
        <span>
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={!value.trim() || submitting}
        className="self-end rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        style={{ background: 'var(--signal-accent)' }}
      >
        {submitting ? 'Posting…' : 'Post comment'}
      </button>
    </form>
  );
}
