import { useState } from 'react';
import { motion } from 'framer-motion';
import { Feed } from '../components/Feed/Feed';
import { PortalModal } from '../components/PortalModal/PortalModal';
import { useAppStore } from '../store/useAppStore';

/** Anonymous visitors still get a full, stable, personal feed — their seed just lives in localStorage instead of a user row. */
function getAnonymousSeed(): string {
  const key = 'unknown_signal_anon_seed';
  try {
    let seed = localStorage.getItem(key);
    if (!seed) {
      seed = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, seed);
    }
    return seed;
  } catch {
    return 'ephemeral-seed';
  }
}

export function HomePage() {
  const user = useAppStore((s) => s.user);
  const [openPortalId, setOpenPortalId] = useState<string | null>(null);
  const userSeed = user ? user.seed : getAnonymousSeed();

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex-1 overflow-hidden">
        <IntroThenFeed userSeed={userSeed} onOpenPortal={setOpenPortalId} />
      </div>
      {openPortalId && <PortalModal templateId={openPortalId} onClose={() => setOpenPortalId(null)} />}
    </div>
  );
}

function IntroThenFeed({ userSeed, onOpenPortal }: { userSeed: string; onOpenPortal: (id: string) => void }) {
  return (
    <div className="relative h-full">
      <Feed userSeed={userSeed} onOpenPortal={onOpenPortal} />
      <Hint />
    </div>
  );
}

function Hint() {
  const depthIndex = useAppStore((s) => s.depthIndex);
  if (depthIndex > 3) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 text-xs font-medium tracking-wide"
      style={{ color: 'var(--signal-ink-muted)' }}
    >
      keep scrolling ↓
    </motion.div>
  );
}
