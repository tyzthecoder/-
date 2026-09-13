import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/Auth/AuthCard';
import { register, ApiError } from '../api/client';
import { useRefreshSession } from '../hooks/useRefreshSession';

const inputStyle = {
  borderColor: 'var(--signal-border)',
  background: 'var(--signal-surface-alt)',
  color: 'var(--signal-ink)',
} as const;

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refreshSession = useRefreshSession();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(username, email, password);
      await refreshSession();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Start your descent" subtitle="Takes ten seconds. The rest takes longer.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username (3-20 letters/numbers/_)"
          autoComplete="username"
          pattern="[a-zA-Z0-9_]{3,20}"
          required
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          required
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--signal-accent)' }}
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm" style={{ color: 'var(--signal-ink-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" className="font-semibold underline" style={{ color: 'var(--signal-accent)' }}>
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
