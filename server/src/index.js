import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { ensureCsrfToken, verifyCsrfToken } from './middleware/csrf.js';
import { attachUser } from './middleware/auth.js';
import { db } from './db/index.js';
import { bus } from './lib/bus.js';
import { SqliteSessionStore } from './lib/SqliteSessionStore.js';

import authRoutes from './routes/auth.js';
import portalRoutes from './routes/portals.js';
import commentRoutes from './routes/comments.js';
import leaderboardRoutes from './routes/leaderboard.js';
import profileRoutes from './routes/profile.js';
import sessionRoutes from './routes/session.js';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: config.clientOrigin, credentials: true },
});
app.set('io', io);

// Trust the first proxy hop (needed for secure cookies + correct req.ip
// behind a load balancer/reverse proxy in production).
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", config.clientOrigin],
      },
    },
  })
);

// CORS is locked to the single configured client origin — never a wildcard —
// and credentials are allowed so the session cookie can travel with fetches.
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '32kb' }));

app.use(
  session({
    store: new SqliteSessionStore(db),
    name: 'unknown.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: config.cookieSameSite,
      secure: config.cookieSecure,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

app.use(attachUser(db));
app.use('/api', apiLimiter);
app.use('/api', ensureCsrfToken);
app.use('/api', verifyCsrfToken);

app.use('/api/auth', authRoutes);
app.use('/api/portals', portalRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/session', sessionRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Generic 404 for unmatched API routes.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Centralized error handler: never leak stack traces or internal details.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

io.on('connection', (socket) => {
  socket.on('portal:subscribe', (templateId) => {
    if (typeof templateId === 'string' && /^t-(light|mid|deep)-\d{1,6}$/.test(templateId)) {
      socket.join(`portal:${templateId}`);
    }
  });
  socket.on('portal:unsubscribe', (templateId) => {
    if (typeof templateId === 'string') socket.leave(`portal:${templateId}`);
  });
});

// Throttled leaderboard broadcast: many events can mark the leaderboard
// "dirty" in quick succession (heartbeats, discoveries) — route handlers
// signal this via the internal `bus`, and we only actually query + push to
// connected clients at most once per interval.
let leaderboardDirty = false;
bus.on('leaderboard:dirty', () => {
  leaderboardDirty = true;
});

setInterval(() => {
  if (!leaderboardDirty) return;
  leaderboardDirty = false;
  const diveTime = db
    .prepare(
      `SELECT users.username, dive_stats.total_seconds, dive_stats.max_depth_index
       FROM dive_stats JOIN users ON users.id = dive_stats.user_id
       ORDER BY dive_stats.total_seconds DESC LIMIT 20`
    )
    .all();
  const depth = db
    .prepare(
      `SELECT users.username, dive_stats.max_depth_index, dive_stats.total_seconds
       FROM dive_stats JOIN users ON users.id = dive_stats.user_id
       ORDER BY dive_stats.max_depth_index DESC LIMIT 20`
    )
    .all();
  io.emit('leaderboard:update', { diveTime, depth });
}, 4000);

httpServer.listen(config.port, () => {
  console.log(`??? server listening on port ${config.port} (${config.nodeEnv})`);
});
