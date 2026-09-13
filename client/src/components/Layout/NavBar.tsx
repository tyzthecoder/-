import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MuteButton } from './MuteButton';
import { ReducedMotionButton } from './ReducedMotionButton';
import { DepthGauge } from './DepthGauge';
import { useAppStore } from '../../store/useAppStore';
import { logout as apiLogout } from '../../api/client';

export function NavBar({ depth }: { depth: number }) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      /* session may already be gone server-side — clear local state regardless */
    }
    setUser(null);
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{ borderColor: 'var(--signal-border)', background: 'color-mix(in srgb, var(--signal-surface) 82%, transparent)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="font-display text-xl font-bold tracking-tight" style={{ color: 'var(--signal-ink)' }}>
          ???
        </Link>

        <DepthGauge depth={depth} />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 text-sm sm:flex">
          <Link to="/leaderboard" className="rounded-full px-3 py-1.5 font-medium transition-colors hover:opacity-80" style={{ color: 'var(--signal-ink-muted)' }}>
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link
                to={`/profile/${user.username}`}
                className="max-w-[10rem] truncate rounded-full px-3 py-1.5 font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--signal-ink-muted)' }}
                title={user.username}
              >
                {user.username}
              </Link>
              <button type="button" onClick={handleLogout} className="rounded-full border px-3 py-1.5 font-medium" style={{ borderColor: 'var(--signal-border)', color: 'var(--signal-ink)' }}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-3 py-1.5 font-medium" style={{ color: 'var(--signal-ink-muted)' }}>
                Log in
              </Link>
              <Link to="/register" className="rounded-full px-3 py-1.5 font-semibold text-white" style={{ background: 'var(--signal-accent)' }}>
                Join
              </Link>
            </>
          )}
          <ReducedMotionButton />
          <MuteButton />
        </nav>

        {/* Mobile controls: always-visible essentials + a menu for navigation */}
        <div className="flex items-center gap-2 sm:hidden">
          <MuteButton />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border text-sm"
            style={{ borderColor: 'var(--signal-border)', background: 'var(--signal-surface)', color: 'var(--signal-ink)' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Mobile navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-1 overflow-hidden border-t px-4 py-3 text-sm sm:hidden"
            style={{ borderColor: 'var(--signal-border)' }}
          >
            <Link to="/leaderboard" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 font-medium" style={{ color: 'var(--signal-ink)' }}>
              Leaderboard
            </Link>
            {user ? (
              <>
                <Link to={`/profile/${user.username}`} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 font-medium" style={{ color: 'var(--signal-ink)' }}>
                  {user.username}'s profile
                </Link>
                <button type="button" onClick={handleLogout} className="rounded-lg px-3 py-2 text-left font-medium" style={{ color: 'var(--signal-ink)' }}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 font-medium" style={{ color: 'var(--signal-ink)' }}>
                  Log in
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 font-semibold" style={{ color: 'var(--signal-accent)' }}>
                  Join
                </Link>
              </>
            )}
            <div className="mt-1 flex items-center gap-2 px-3">
              <ReducedMotionButton />
              <span className="text-xs" style={{ color: 'var(--signal-ink-muted)' }}>
                Reduce motion
              </span>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
