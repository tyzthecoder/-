import { motion } from 'framer-motion';
import type { FeedItem } from '../../content/feedGenerator';
import { buildPortalTemplate } from '../../content/portalTemplates';
import { FillerArt, PortalArt } from './GeneratedArt';
import { useMemo } from 'react';

interface Props {
  item: FeedItem;
  onOpenPortal: (templateId: string) => void;
  reducedMotion: boolean;
}

const cardMotion = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export function FeedItemCard({ item, onOpenPortal, reducedMotion }: Props) {
  const template = useMemo(
    () => (item.kind === 'portal' ? buildPortalTemplate(item.templateId) : null),
    [item]
  );

  return (
    <motion.div
      initial={reducedMotion ? undefined : 'hidden'}
      whileInView={reducedMotion ? undefined : 'visible'}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      variants={cardMotion}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-xl px-4"
    >
      {item.kind === 'filler' ? (
        <div
          className="flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-sm"
          style={{
            background: 'var(--signal-surface-alt)',
            borderColor: 'var(--signal-border)',
            color: 'var(--signal-ink)',
            boxShadow: '0 8px 30px var(--signal-shadow)',
          }}
        >
          <FillerArt art={item.art} tone={item.tone} />
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--signal-ink-muted)' }}>
            {item.text}
          </p>
        </div>
      ) : template ? (
        <motion.button
          type="button"
          onClick={() => onOpenPortal(item.templateId)}
          whileHover={reducedMotion ? undefined : { scale: 1.02, y: -2 }}
          whileTap={reducedMotion ? undefined : { scale: 0.98 }}
          className="group relative flex w-full items-center gap-5 overflow-hidden rounded-3xl border p-6 text-left"
          style={{
            background: 'var(--signal-surface)',
            borderColor: 'var(--signal-border)',
            boxShadow: `0 12px 40px var(--signal-shadow)`,
          }}
        >
          {template.isUltra && (
            <span
              className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: 'var(--signal-accent)', color: 'white' }}
            >
              ultra rare
            </span>
          )}
          <PortalArt shape={template.shape} tone={template.tone} templateId={template.templateId} isUltra={template.isUltra} />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--signal-ink)' }}>
              {template.title}
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--signal-ink-muted)' }}>
              {template.blurb}
            </p>
            <span
              className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest transition-transform group-hover:translate-x-1"
              style={{ color: 'var(--signal-accent)' }}
            >
              open portal →
            </span>
          </div>
        </motion.button>
      ) : null}
    </motion.div>
  );
}
