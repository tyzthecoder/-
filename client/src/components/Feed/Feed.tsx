import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FeedItemCard } from './FeedItemCard';
import { generateFeedItem } from '../../content/feedGenerator';
import { useAppStore } from '../../store/useAppStore';

const INITIAL_COUNT = 60;
const GROW_BY = 40;
const GROW_THRESHOLD = 15;

interface Props {
  userSeed: string;
  onOpenPortal: (templateId: string) => void;
}

export function Feed({ userSeed, onOpenPortal }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [itemCount, setItemCount] = useState(INITIAL_COUNT);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setDepthIndex = useAppStore((s) => s.setDepthIndex);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 210,
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems.length ? virtualItems[virtualItems.length - 1].index : 0;
  const firstIndex = virtualItems.length ? virtualItems[0].index : 0;

  useEffect(() => {
    if (lastIndex >= itemCount - GROW_THRESHOLD) {
      setItemCount((c) => Math.max(c, lastIndex + GROW_BY));
    }
  }, [lastIndex, itemCount]);

  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setDepthIndex(firstIndex));
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [firstIndex, setDepthIndex]);

  const items = useMemo(
    () => virtualItems.map((vi) => ({ vi, item: generateFeedItem(userSeed, vi.index) })),
    [virtualItems, userSeed]
  );

  return (
    <div ref={parentRef} className="relative h-full w-full overflow-y-auto overscroll-contain" data-feed-scroll>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map(({ vi, item }) => (
          <div
            key={vi.key}
            ref={virtualizer.measureElement}
            data-index={vi.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vi.start}px)`,
              paddingBottom: '1.25rem',
              paddingTop: '1.25rem',
            }}
          >
            <FeedItemCard item={item} onOpenPortal={onOpenPortal} reducedMotion={reducedMotion} />
          </div>
        ))}
      </div>
    </div>
  );
}
