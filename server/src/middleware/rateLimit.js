import rateLimit from 'express-rate-limit';

// Generic error shape that never leaks internals.
const handler = (req, res) => {
  res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
};

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Keyed by IP: slows down mass account creation from a single source.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Keyed by IP: slows down credential-stuffing / brute force attempts.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Comments: quota (100/month) is enforced separately in the route handler;
// this just stops someone from bursting requests at the endpoint.
export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => (req.session && req.session.userId ? `user:${req.session.userId}` : req.ip),
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => (req.session && req.session.userId ? `user:${req.session.userId}` : req.ip),
});

export const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => (req.session && req.session.userId ? `user:${req.session.userId}` : req.ip),
});
