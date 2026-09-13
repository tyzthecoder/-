import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { computeRarity } from '../lib/rarity.js';
import {
  sanitizeCommentBody,
  findModerationViolation,
  MAX_COMMENT_LENGTH,
  MIN_COMMENT_LENGTH,
} from '../lib/moderation.js';
import { commentLimiter } from '../middleware/rateLimit.js';
import { config } from '../config.js';
import { bus } from '../lib/bus.js';

const router = Router();

const templateIdPattern = /^t-(light|mid|deep)-\d{1,6}$/;

function isValidTemplateId(id) {
  return typeof id === 'string' && templateIdPattern.test(id);
}

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Discover a portal (idempotent per user+template). Awards rarity/badge info.
// ---------------------------------------------------------------------------
const discoverSchema = z.object({
  tone: z.enum(['light', 'mid', 'deep']),
  depthIndex: z.number().int().min(0).max(10_000_000),
});

router.post('/:templateId/discover', requireAuth, (req, res) => {
  const { templateId } = req.params;
  if (!isValidTemplateId(templateId)) {
    return res.status(400).json({ error: 'Invalid portal id.' });
  }
  const parsed = discoverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid discovery payload.' });
  const { tone, depthIndex } = parsed.data;
  const userId = req.session.userId;

  const already = db
    .prepare('SELECT id FROM portal_discoveries WHERE user_id = ? AND template_id = ?')
    .get(userId, templateId);

  const tx = db.transaction(() => {
    if (!already) {
      db.prepare(
        `INSERT INTO portal_discoveries (user_id, template_id, tone, depth_index) VALUES (?, ?, ?, ?)`
      ).run(userId, templateId, tone, depthIndex);

      db.prepare(
        `INSERT INTO template_stats (template_id, discover_count) VALUES (?, 1)
         ON CONFLICT(template_id) DO UPDATE SET discover_count = discover_count + 1`
      ).run(templateId);
    }

    db.prepare(
      `UPDATE dive_stats SET max_depth_index = MAX(max_depth_index, ?), updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(depthIndex, userId);
  });
  tx();

  const stats = db.prepare('SELECT discover_count FROM template_stats WHERE template_id = ?').get(templateId);
  const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const rarity = computeRarity(stats ? stats.discover_count : 1, totalUsers);

  bus.emit('leaderboard:dirty');

  res.json({ isNewDiscovery: !already, rarity });
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
router.get('/:templateId/comments', (req, res) => {
  const { templateId } = req.params;
  if (!isValidTemplateId(templateId)) {
    return res.status(400).json({ error: 'Invalid portal id.' });
  }
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const rows = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at, users.username
       FROM comments JOIN users ON users.id = comments.user_id
       WHERE comments.template_id = ? AND comments.is_removed = 0
       ORDER BY comments.created_at DESC LIMIT ?`
    )
    .all(templateId, limit);
  res.json({ comments: rows.reverse() });
});

const commentSchema = z.object({
  body: z.string().min(MIN_COMMENT_LENGTH).max(MAX_COMMENT_LENGTH),
});

router.post('/:templateId/comments', requireAuth, commentLimiter, (req, res) => {
  const { templateId } = req.params;
  if (!isValidTemplateId(templateId)) {
    return res.status(400).json({ error: 'Invalid portal id.' });
  }
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: `Comments must be ${MIN_COMMENT_LENGTH}-${MAX_COMMENT_LENGTH} characters.` });
  }

  const clean = sanitizeCommentBody(parsed.data.body);
  if (!clean) return res.status(400).json({ error: 'Comment cannot be empty.' });

  const violation = findModerationViolation(clean);
  if (violation) return res.status(400).json({ error: violation });

  const userId = req.session.userId;
  const period = currentPeriod();

  const quotaRow = db
    .prepare('SELECT count FROM comment_quota WHERE user_id = ? AND period = ?')
    .get(userId, period);
  const used = quotaRow ? quotaRow.count : 0;

  if (used >= config.commentMonthlyLimit) {
    return res.status(429).json({
      error: `You've used all ${config.commentMonthlyLimit} of your comments this month. They refresh next month — choose wisely.`,
    });
  }

  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO comments (user_id, template_id, body) VALUES (?, ?, ?)')
      .run(userId, templateId, clean);
    db.prepare(
      `INSERT INTO comment_quota (user_id, period, count) VALUES (?, ?, 1)
       ON CONFLICT(user_id, period) DO UPDATE SET count = count + 1`
    ).run(userId, period);
    return info.lastInsertRowid;
  });
  const commentId = tx();

  const username = db.prepare('SELECT username FROM users WHERE id = ?').get(userId).username;
  const comment = {
    id: commentId,
    body: clean,
    created_at: new Date().toISOString(),
    username,
  };

  const io = req.app.get('io');
  if (io) io.to(`portal:${templateId}`).emit('comment:new', { templateId, comment });

  res.status(201).json({ comment, commentsUsedThisMonth: used + 1, commentsRemaining: config.commentMonthlyLimit - used - 1 });
});

export default router;
