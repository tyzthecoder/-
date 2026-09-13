import { Router } from 'express';
import { db } from '../db/index.js';
import { computeRarity } from '../lib/rarity.js';

const router = Router();

function buildProfile(user) {
  const stats = db.prepare('SELECT total_seconds, max_depth_index FROM dive_stats WHERE user_id = ?').get(user.id) || {
    total_seconds: 0,
    max_depth_index: 0,
  };

  const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;

  const discoveries = db
    .prepare(
      `SELECT pd.template_id, pd.tone, pd.depth_index, pd.discovered_at, ts.discover_count
       FROM portal_discoveries pd
       LEFT JOIN template_stats ts ON ts.template_id = pd.template_id
       WHERE pd.user_id = ?
       ORDER BY pd.discovered_at DESC`
    )
    .all(user.id);

  const badges = discoveries.map((d) => ({
    templateId: d.template_id,
    tone: d.tone,
    depthIndex: d.depth_index,
    discoveredAt: d.discovered_at,
    rarity: computeRarity(d.discover_count || 1, totalUsers),
  }));

  return {
    username: user.username,
    createdAt: user.created_at,
    totalSeconds: stats.total_seconds,
    maxDepthIndex: stats.max_depth_index,
    badgeCount: badges.length,
    badges,
  };
}

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ profile: buildProfile(user) });
});

router.get('/:username', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ profile: buildProfile(user) });
});

export default router;
