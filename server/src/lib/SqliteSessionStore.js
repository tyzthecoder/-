import { Store } from 'express-session';

// A minimal express-session store backed by our existing better-sqlite3
// database, so sessions survive restarts without pulling in a second,
// separately-maintained sqlite driver + native build toolchain just for
// session storage.
export class SqliteSessionStore extends Store {
  constructor(db) {
    super();
    this.db = db;
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        expires INTEGER NOT NULL,
        data TEXT NOT NULL
      );
    `);
    this._statements = {
      get: db.prepare('SELECT data, expires FROM sessions WHERE sid = ?'),
      set: db.prepare(
        `INSERT INTO sessions (sid, expires, data) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data`
      ),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      touch: db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
      prune: db.prepare('DELETE FROM sessions WHERE expires < ?'),
    };

    // Periodically sweep expired sessions so the table doesn't grow forever.
    this._pruneInterval = setInterval(() => {
      this._statements.prune.run(Date.now());
    }, 60 * 60 * 1000).unref();
  }

  get(sid, cb) {
    try {
      const row = this._statements.get.get(sid);
      if (!row || row.expires < Date.now()) return cb(null, null);
      cb(null, JSON.parse(row.data));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, session, cb) {
    try {
      const maxAge = session.cookie && session.cookie.maxAge ? session.cookie.maxAge : 24 * 60 * 60 * 1000;
      const expires = Date.now() + maxAge;
      this._statements.set.run(sid, expires, JSON.stringify(session));
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this._statements.destroy.run(sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  touch(sid, session, cb) {
    try {
      const maxAge = session.cookie && session.cookie.maxAge ? session.cookie.maxAge : 24 * 60 * 60 * 1000;
      this._statements.touch.run(Date.now() + maxAge, sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }
}
