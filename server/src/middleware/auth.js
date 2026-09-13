export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

export function requireMod(req, res, next) {
  if (!req.session || !req.session.userId || !req.session.isMod) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export function attachUser(db) {
  return (req, res, next) => {
    req.currentUser = null;
    if (req.session && req.session.userId) {
      req.currentUser = db
        .prepare(
          'SELECT id, username, email, is_mod, is_verified, seed, created_at FROM users WHERE id = ?'
        )
        .get(req.session.userId);
    }
    next();
  };
}
