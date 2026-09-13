import { useEffect, useState } from 'react';
import { getSocket } from './useSocket';
import { getLeaderboard, type LeaderboardRow } from '../api/client';

export function useLiveLeaderboard(kind: 'dive-time' | 'depth') {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getLeaderboard(kind)
      .then((res) => {
        if (!cancelled) setRows(res.leaderboard);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const socket = getSocket();
    const onUpdate = (payload: { diveTime: LeaderboardRow[]; depth: LeaderboardRow[] }) => {
      setRows(kind === 'dive-time' ? payload.diveTime : payload.depth);
    };
    socket.on('leaderboard:update', onUpdate);

    return () => {
      cancelled = true;
      socket.off('leaderboard:update', onUpdate);
    };
  }, [kind]);

  return { rows, loading };
}
