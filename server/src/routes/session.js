import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { heartbeatLimiter } from '../middleware/rateLimit.js';
import { bus } from '../lib/bus.js';

const router = Router();

// Client pings roughly every 20s while the tab is visible and the user is
// active. We cap the reported interval server-side so a tampered client
// can't fast-forward its own dive time or depth.
const MAX_HEARTBEAT_SECONDS = 60;

const heartbeatSchema = z.object({
  seconds: z.number().min(0).max(MAX_HEARTBEAT_SECONDS),
  depthIndex: z.number().int().min(0).max(10_000_000).optional(),
});

router.post('/heartbeat', requireAuth, heartbeatLimiter, (req, res) => {
  const parsed = heartbeatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid heartbeat payload.' });
  const { seconds, depthIndex } = parsed.data;

  db.prepare(
    `UPDATE dive_stats
     SET total_seconds = total_seconds + ?,
         max_depth_index = MAX(max_depth_index, ?),
         updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(Math.round(seconds), depthIndex ?? 0, req.session.userId);

  const stats = db.prepare('SELECT total_seconds, max_depth_index FROM dive_stats WHERE user_id = ?').get(req.session.userId);

  bus.emit('leaderboard:dirty');

  res.json({ stats });
});

export default router;
