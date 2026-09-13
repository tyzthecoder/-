import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/index.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { ensureCsrfToken } from '../middleware/csrf.js';
import { config } from '../config.js';

const router = Router();

const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;

const registerSchema = z.object({
  username: z.string().regex(usernamePattern, 'Username must be 3-20 letters, numbers, or underscores'),
  email: z.string().email().max(254),
  password: z.string().min(8).max(72), // bcrypt truncates beyond 72 bytes
});

const loginSchema = z.object({
  identifier: z.string().min(1).max(254),
  password: z.string().min(1).max(72),
});

router.get('/csrf', ensureCsrfToken, (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    isMod: !!user.is_mod,
    isVerified: !!user.is_verified,
    seed: user.seed,
    createdAt: user.created_at,
  };
}

router.post('/register', registerLimiter, (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration details.' });
  }
  const { username, email, password } = parsed.data;

  const existing = db
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(username, email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Username or email already in use.' });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const seed = crypto.randomBytes(16).toString('hex');
  const verificationToken = crypto.randomBytes(20).toString('hex');

  const insert = db.prepare(
    `INSERT INTO users (username, email, password_hash, seed, verification_token)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = insert.run(username, email.toLowerCase(), passwordHash, seed, verificationToken);

  db.prepare('INSERT INTO dive_stats (user_id) VALUES (?)').run(info.lastInsertRowid);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not start session.' });
    req.session.userId = user.id;
    req.session.isMod = !!user.is_mod;
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');

    // NOTE: no outbound email service is wired up in this build. In a real
    // deployment, `verificationToken` would be emailed to the user and
    // confirmed via a GET /api/auth/verify?token=... route. We return it
    // here only so the flow is demonstrable end-to-end without SMTP.
    res.status(201).json({
      user: publicUser(user),
      csrfToken: req.session.csrfToken,
      devVerificationToken: process.env.NODE_ENV === 'production' ? undefined : verificationToken,
    });
  });
});

router.post('/login', loginLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials.' });
  }
  const { identifier, password } = parsed.data;

  const user = db
    .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .get(identifier, identifier.toLowerCase());

  // Constant-shape response whether the user exists or not, so login
  // failures don't leak which accounts exist.
  const hash = user ? user.password_hash : '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsal';
  const ok = bcrypt.compareSync(password, hash);

  if (!user || !ok) {
    return res.status(401).json({ error: 'Incorrect username/email or password.' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not start session.' });
    req.session.userId = user.id;
    req.session.isMod = !!user.is_mod;
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    res.json({ user: publicUser(user), csrfToken: req.session.csrfToken });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('unknown.sid');
    if (err) return res.status(500).json({ error: 'Could not log out cleanly.' });
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(200).json({ user: null });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(200).json({ user: null });

  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const quota = db
    .prepare('SELECT count FROM comment_quota WHERE user_id = ? AND period = ?')
    .get(user.id, period);

  res.json({
    user: publicUser(user),
    csrfToken: req.session.csrfToken,
    commentsUsedThisMonth: quota ? quota.count : 0,
    commentMonthlyLimit: config.commentMonthlyLimit,
  });
});

router.get('/verify', (req, res) => {
  const token = String(req.query.token || '');
  if (!token) return res.status(400).json({ error: 'Missing token.' });
  const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token.' });
  db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
  res.json({ ok: true });
});

export default router;
