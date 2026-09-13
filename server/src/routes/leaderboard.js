import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/dive-time', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rows = db
    .prepare(
      `SELECT users.username, dive_stats.total_seconds, dive_stats.max_depth_index
       FROM dive_stats JOIN users ON users.id = dive_stats.user_id
       ORDER BY dive_stats.total_seconds DESC LIMIT ?`
    )
    .all(limit);
  res.json({ leaderboard: rows });
});

router.get('/depth', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rows = db
    .prepare(
      `SELECT users.username, dive_stats.max_depth_index, dive_stats.total_seconds
       FROM dive_stats JOIN users ON users.id = dive_stats.user_id
       ORDER BY dive_stats.max_depth_index DESC LIMIT ?`
    )
    .all(limit);
  res.json({ leaderboard: rows });
});

export default router;
