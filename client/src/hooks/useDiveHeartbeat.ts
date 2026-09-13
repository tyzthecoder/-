import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { sendHeartbeat } from '../api/client';

const HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Periodically reports accumulated active (tab-visible) time and current
 * depth to the server, which is what powers the dive-time leaderboard. Time
 * only accrues while the tab is actually visible, so leaving it open in a
 * background tab doesn't inflate anyone's rank.
 */
export function useDiveHeartbeat() {
  const user = useAppStore((s) => s.user);
  const depthIndexRef = useRef(0);
  const depthIndex = useAppStore((s) => s.depthIndex);

  useEffect(() => {
    depthIndexRef.current = depthIndex;
  }, [depthIndex]);

  useEffect(() => {
    if (!user) return;

    let lastTick = Date.now();
    let accumulatedActive = 0;

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;
      if (document.visibilityState === 'visible') {
        accumulatedActive += delta;
      }
      if (accumulatedActive >= 1) {
        const seconds = Math.min(60, accumulatedActive);
        accumulatedActive = 0;
        sendHeartbeat(seconds, depthIndexRef.current).catch(() => {
          // Best-effort — a dropped heartbeat just means a little less
          // credited dive time, never a broken experience.
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user]);
}
