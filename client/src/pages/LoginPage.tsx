import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/Auth/AuthCard';
import { login, ApiError } from '../api/client';
import { useRefreshSession } from '../hooks/useRefreshSession';

const inputStyle = {
  borderColor: 'var(--signal-border)',
  background: 'var(--signal-surface-alt)',
  color: 'var(--signal-ink)',
} as const;

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
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
      await login(identifier, password);
      await refreshSession();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Pick up right where you left off.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Username or email"
          autoComplete="username"
          required
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
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
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm" style={{ color: 'var(--signal-ink-muted)' }}>
        New here?{' '}
        <Link to="/register" className="font-semibold underline" style={{ color: 'var(--signal-accent)' }}>
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
