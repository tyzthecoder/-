import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildPortalTemplate } from '../../content/portalTemplates';
import { PortalArt } from '../Feed/GeneratedArt';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
import { usePortalComments } from '../../hooks/usePortalComments';
import { discoverPortal, type Rarity } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  templateId: string;
  onClose: () => void;
}

export function PortalModal({ templateId, onClose }: Props) {
  const template = useRef(buildPortalTemplate(templateId)).current;
  const user = useAppStore((s) => s.user);
  const depthIndex = useAppStore((s) => s.depthIndex);
  const pushBadgeToast = useAppStore((s) => s.pushBadgeToast);
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { comments, loading, submit } = usePortalComments(templateId);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user || !template) return;
    let cancelled = false;
    discoverPortal(templateId, template.tone, depthIndex)
      .then((res) => {
        if (cancelled) return;
        setRarity(res.rarity);
        if (res.isNewDiscovery) {
          pushBadgeToast({ templateId, rarity: res.rarity });
        }
      })
      .catch(() => {
        /* discovery tracking is best-effort — never block viewing the portal */
      });
    return () => {
      cancelled = true;
    };
    // Only fire once per opened portal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, user]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!template) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          role="dialog"
          aria-modal
          aria-label={template.title}
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl border p-6 shadow-2xl"
          style={{ background: 'var(--signal-surface)', borderColor: 'var(--signal-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-sm"
            style={{ background: 'var(--signal-surface-alt)', color: 'var(--signal-ink-muted)' }}
          >
            ✕
          </button>

          <div className="flex items-center gap-4">
            <PortalArt shape={template.shape} tone={template.tone} templateId={template.templateId} isUltra={template.isUltra} size={72} />
            <div>
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--signal-ink)' }}>
                {template.title}
              </h2>
              {rarity && (
                <span
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: `${rarity.color}22`, color: rarity.color }}
                >
                  {rarity.label} · found by {rarity.discoverCount} diver{rarity.discoverCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--signal-ink-muted)' }}>
            {template.blurb}
          </p>

          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border px-4 py-3 text-sm italic"
                style={{ borderColor: 'var(--signal-border)', background: 'var(--signal-surface-alt)', color: 'var(--signal-ink)' }}
              >
                {template.miniExperience}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-px w-full" style={{ background: 'var(--signal-border)' }} />

          <div>
            <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--signal-ink-muted)' }}>
              Comments
            </h3>
            <CommentList comments={comments} loading={loading} />
            <div className="mt-3">
              <CommentForm onSubmit={submit} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
