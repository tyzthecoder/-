import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireMod } from '../middleware/auth.js';
import { reportLimiter } from '../middleware/rateLimit.js';

const router = Router();

const reportSchema = z.object({ reason: z.string().max(200).optional() });

router.post('/:commentId/report', requireAuth, reportLimiter, (req, res) => {
  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(commentId)) return res.status(400).json({ error: 'Invalid comment id.' });
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid report.' });

  const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const tx = db.transaction(() => {
    const result = db
      .prepare('INSERT OR IGNORE INTO comment_reports (comment_id, reporter_id, reason) VALUES (?, ?, ?)')
      .run(commentId, req.session.userId, parsed.data.reason || null);
    if (result.changes > 0) {
      db.prepare('UPDATE comments SET report_count = report_count + 1 WHERE id = ?').run(commentId);
    }
  });
  tx();

  res.json({ ok: true });
});

// --- Moderator-only endpoints ---------------------------------------------

router.get('/flagged', requireMod, (req, res) => {
  const rows = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at, comments.report_count,
              comments.template_id, users.username
       FROM comments JOIN users ON users.id = comments.user_id
       WHERE comments.report_count >= 3 AND comments.is_removed = 0
       ORDER BY comments.report_count DESC LIMIT 100`
    )
    .all();
  res.json({ comments: rows });
});

const removeSchema = z.object({ reason: z.string().max(200).optional() });

router.post('/:commentId/remove', requireMod, (req, res) => {
  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(commentId)) return res.status(400).json({ error: 'Invalid comment id.' });
  const parsed = removeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request.' });

  const result = db
    .prepare('UPDATE comments SET is_removed = 1, removed_reason = ? WHERE id = ?')
    .run(parsed.data.reason || 'Removed by moderator.', commentId);
  if (result.changes === 0) return res.status(404).json({ error: 'Comment not found.' });

  res.json({ ok: true });
});

export default router;
