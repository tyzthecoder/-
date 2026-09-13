import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProfile, type Profile } from '../api/client';
import { depthProgress } from '../content/depth';
import { computeTheme } from '../content/palette';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m total`;
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    getProfile(username)
      .then((res) => {
        if (!cancelled) setProfile(res.profile);
      })
      .catch(() => {
        if (!cancelled) setError('This diver could not be found.');
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (error) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center" style={{ color: 'var(--signal-ink-muted)' }}>{error}</p>;
  }
  if (!profile) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center" style={{ color: 'var(--signal-ink-muted)' }}>Loading…</p>;
  }

  // The profile card reflects *how deep this person has been*, independent
  // of the live scroll-position theme applied to the rest of the app.
  const theme = computeTheme(depthProgress(profile.maxDepthIndex));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border p-8"
        style={{ background: theme.surface, borderColor: theme.border, color: theme.ink, boxShadow: `0 20px 60px ${theme.shadow}` }}
      >
        <h1 className="break-all font-display text-2xl font-bold sm:text-3xl">{profile.username}</h1>
        <p className="mt-1 text-sm" style={{ color: theme.inkMuted }}>
          Diving since {new Date(profile.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString()}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Stat label="Dive time" value={formatDuration(profile.totalSeconds)} theme={theme} />
          <Stat label="Depth reached" value={`#${profile.maxDepthIndex}`} theme={theme} />
          <Stat label="Badges" value={String(profile.badgeCount)} theme={theme} />
        </div>
      </motion.div>

      <h2 className="mt-8 font-display text-xl font-bold" style={{ color: 'var(--signal-ink)' }}>
        Discoveries
      </h2>
      {profile.badges.length === 0 ? (
        <p className="mt-2 text-sm italic" style={{ color: 'var(--signal-ink-muted)' }}>
          No portals discovered yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profile.badges.map((badge, i) => (
            <motion.div
              key={badge.templateId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border p-3 text-center"
              style={{ borderColor: badge.rarity.color, background: 'var(--signal-surface)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: badge.rarity.color }}>
                {badge.rarity.label}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--signal-ink-muted)' }}>
                depth #{badge.depthIndex} · {badge.tone}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof computeTheme> }) {
  return (
    <div className="rounded-2xl px-2 py-3" style={{ background: theme.surfaceAlt }}>
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-xs" style={{ color: theme.inkMuted }}>
        {label}
      </p>
    </div>
  );
}
