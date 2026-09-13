import crypto from 'node:crypto';

// Lightweight double-submit-cookie CSRF protection. A per-session token is
// generated on first contact, exposed to the client via GET /api/auth/csrf
// (readable JS, *not* the session cookie itself, which stays httpOnly), and
// must be echoed back on every mutating request as the `x-csrf-token`
// header. Because the session cookie is httpOnly + sameSite=lax, a
// cross-site page cannot read the token to forge the header.
export function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  next();
}

export function verifyCsrfToken(req, res, next) {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) return next();

  const headerToken = req.get('x-csrf-token');
  if (!headerToken || !req.session.csrfToken || headerToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}
