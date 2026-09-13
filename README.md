# ??? — a deep-dive social platform

A single, infinite feed. Scroll and it keeps generating content — some of it
just atmosphere, some of it a clickable "portal" into a tiny discovery. The
top is bright and friendly. Keep going and, so gradually you won't notice it
happening, it gets stranger, quieter, and darker. There's a real community
underneath it — real comments, a live leaderboard, badges for finding things
almost nobody else has found.

This repo is a full working implementation of that idea: a Node/Express API
with real auth, persistence, and moderation, and a React client that
generates the entire experience procedurally.

## How it's put together

```
client/   React + TypeScript + Vite — the feed, portals, audio, everything visual
server/   Express + SQLite — accounts, comments, discoveries, leaderboard
```

They're independent deployables that talk over a JSON API + a websocket.
Nothing about the client requires the server to be co-hosted — CORS is
locked to a single configured origin (`CLIENT_ORIGIN`), so you can put the
client on a CDN/static host and the API anywhere that runs Node.

### Quick start

```bash
npm install                      # installs both workspaces
cp server/.env.example server/.env
npm run dev:server               # http://localhost:4000
npm run dev:client               # http://localhost:5173 (proxies /api + /socket.io to :4000)
```

Open `http://localhost:5173`. You can scroll and click portals as a guest;
log in to start banking dive time, earning badges, and commenting.

Run the server's test suite with `npm run test:server`.

### Deploying (client on Vercel, API elsewhere)

The client is a static Vite build — a good fit for Vercel. The API is not:
`better-sqlite3` needs a persistent writable disk and Socket.IO needs
long-lived connections, neither of which fit Vercel's serverless model. Run
`server/` as a normal long-lived Node process instead (Render, Railway,
Fly.io, a VM — anywhere that gives you a persistent disk), and point the
Vercel-hosted client at it:

1. Deploy `server/` to your Node host. Copy `server/.env.production` there,
   fill in real values (a freshly generated `SESSION_SECRET`, the exact
   client origin, a `DATA_DIR` on a persistent volume), and set
   `COOKIE_SAME_SITE=none` — the client and API are on different domains
   (cross-site), so the session cookie needs `SameSite=None; Secure` or the
   browser won't send it back on API calls.

   **On Render specifically**, `render.yaml` at the repo root is a ready-made
   blueprint (root dir `server/`, build `npm install`, start `npm start`, a
   persistent disk mounted for `DATA_DIR`) — import it from
   [the Blueprints dashboard](https://dashboard.render.com/blueprints) and
   Render will prompt you for the `sync: false` values instead of you typing
   commands by hand. Whichever way you deploy: Render (and most hosts) sets
   `NODE_ENV=production` automatically, and this server *deliberately*
   refuses to boot in production without `SESSION_SECRET` set — a crash
   that looks like "the start command doesn't work" is almost always just
   that var missing from the dashboard's environment settings, not a bug in
   `package.json`'s `start` script.
2. Deploy `client/` to Vercel (set its root directory to `client/` if
   importing the whole monorepo). Fill in `client/.env.production`'s
   `VITE_API_URL` with your API's real origin before building — Vite bakes
   it into the bundle at build time. `client/vercel.json` adds the rewrite
   client-side routing needs (so refreshing `/leaderboard` doesn't 404).
3. Set the API's `CLIENT_ORIGIN` to the exact Vercel URL from step 2 (CORS
   is locked to that one origin) and redeploy the API.

Both `.env.production` files are committed as **templates** with placeholder
values, not real secrets — fill in the real ones directly in your host's
environment variable settings rather than committing them.

## The core mechanic: how "infinite, personal, but shared" works

Everything in the feed is a **pure function of a seed and a position** —
nothing is stored per-item on the server, and nothing is truly random at
request time. That one decision is what makes the rest of the brief
possible:

- **Depth** (`client/src/content/depth.ts`) maps a feed index to a `0..1`
  progress value on a slow exponential curve, so the trip from light to dark
  takes a genuinely long scroll — at a relaxed pace, "deep" territory is
  hours away, not a few dozen posts. Tone (light/mid/deep) blends
  continuously from that value, driving color, audio, and portal frequency
  all from the same number, so they always shift in lockstep.
- **A user's feed** is seeded by their account (or, for guests, a
  `localStorage` id) — same seed, same scroll position, same content, every
  time. That's what makes a feed feel personal and stable rather than
  reshuffling on every reload.
- **Portals** are drawn from a large *shared* pool per tone
  (`client/src/content/portalTemplates.ts`), keyed only by a `templateId`
  like `t-deep-1842`. A template's entire content (title, art, mini reveal)
  is generated purely from that id — never from the viewing user's seed —
  so two different people can land on the exact same portal at different
  points in their own feeds. That's the "rare coincidence" the brief asks
  for, and it's also *why* server-side rarity tracking works at all: the
  server only ever needs to persist an opaque id and a discovery count, not
  any content.
- **Word banks + generated SVG shapes**, not `Math.random()` noise —
  everything is recombined from curated, tone-appropriate vocabulary
  (`content/wordbanks.ts`) and seeded geometry (`content/shapePath.ts`), so
  output is varied without ever reading as garbage text or clip-art.

## Feature-by-feature

- **Infinite feed** — virtualized with `@tanstack/react-virtual` so DOM size
  stays flat no matter how far anyone scrolls; grows its window as you
  approach the end. Framer Motion fades each card in as it enters view.
- **Portals** — clicking one opens a modal, records a discovery, and shows a
  short "mini-experience" reveal plus the real comment thread for that
  template. Rarity (common → uncommon → rare → legendary) is computed
  server-side from how many distinct users have ever found it, and ~2% of
  each tone's pool is reserved as inherently low-probability "ultra" draws.
- **Comments** — real, persisted, public, sanitized server-side (all HTML
  stripped, not just escaped), capped at 100/user/month, rate-limited
  per-minute, live-updated via Socket.IO to anyone else viewing the same
  portal. A report button flags a comment for the moderator queue.
- **Badges & rarity** — every discovery becomes a badge on your profile;
  hitting a new one pops an animated toast immediately.
- **Leaderboards** — total dive time and deepest index reached, pushed live
  over the socket whenever anyone's stats change (throttled server-side so a
  burst of activity doesn't spam every client).
- **Dive time** — tracked by a heartbeat that only counts seconds while the
  tab is actually visible, capped server-side so a tampered client can't
  fast-forward its own rank.
- **Profiles** — a snapshot of one person's descent: dive time, deepest
  point, badge grid. The profile card's own color theme is computed from
  *their* max depth, independent of whatever depth you're scrolled to.
- **Generative audio** — no audio files at all. Three ambient synth "zones"
  (bright pad / suspended pad / dissonant drone) run continuously via the
  Web Audio API and crossfade by the same depth value driving the visuals,
  plus a noise bed that grows from a shimmer into a low wind. Starts on the
  first click/keypress (browser autoplay policy); the mute button lives in
  the corner as required.
- **Accessibility** — a reduce-motion toggle (and `prefers-reduced-motion`
  is honored automatically), a mute toggle, and text contrast is checked at
  every depth stop, not just the endpoints.
- **Responsive** — usable from a 400px phone up; the nav collapses into a
  proper menu on small screens rather than just hiding links with no way
  back to them.

## Security

- **Passwords**: `bcryptjs`, cost factor 12. Login responses are
  constant-shape whether the account exists or not, to avoid username
  enumeration.
- **Sessions**: httpOnly, `sameSite=lax`, `secure` in production, stored
  server-side (a small custom SQLite-backed store — see
  `server/src/lib/SqliteSessionStore.js`) rather than in a signed cookie, so
  they can be revoked. `trust proxy` is enabled for correct behavior behind
  a reverse proxy/load balancer.
- **CSRF**: double-submit-cookie pattern — a per-session token issued over
  `GET /api/auth/csrf` must be echoed back as `x-csrf-token` on every
  mutating request. Verified end-to-end in testing (mutations are rejected
  without it).
- **Input validation**: every request body is validated with `zod`; portal
  ids are matched against a strict pattern before touching the database.
- **Injection**: every query in the codebase is a parameterized
  `better-sqlite3` prepared statement — none are string-concatenated.
- **XSS**: comment bodies are run through `sanitize-html` with *zero*
  allowed tags/attributes before they're ever stored, so every reader of
  `comments.body` is safe by construction, not by remembering to escape on
  the way out.
- **Content moderation**: comments containing URLs or a (deliberately small,
  swap-in-your-own) blocklist of spam phrases are rejected outright; a
  report endpoint flags comments for a moderator queue; a `POST
  /:id/remove` endpoint (mod-only) soft-deletes.
- **Rate limiting**: separate `express-rate-limit` policies for
  registration (by IP, guards against mass account creation), login (by IP,
  guards brute force), comments/reports/heartbeats (by user), and a general
  API-wide ceiling.
- **Comment economy**: the 100/month cap is enforced server-side against a
  `comment_quota` row, not trusted from the client.
- **CORS**: locked to exactly one configured origin, not a wildcard.
- **Error handling**: a single centralized error handler returns a generic
  500 message — stack traces and internals never reach a response.
- **Dependencies**: `npm audit` is clean for the server. The client carries
  one accepted, low-real-risk finding — a `vite`-bundled `esbuild` dev
  server CORS issue that only matters if you run `vite dev` and browse a
  malicious site at the same time; it does not affect production builds
  (`vite build` ships no dev server) and fixing it currently requires a
  major Vite bump we didn't judge worth the churn for this project.

### What's intentionally stubbed for a real deployment

- **Email verification**: the flow exists end-to-end (`is_verified`,
  `verification_token`, `GET /api/auth/verify`) but nothing sends an email —
  no SMTP/provider is wired up. In dev, the token comes back in the register
  response so you can hit `/api/auth/verify?token=...` yourself.
- **HTTPS**: enforced by *not* being terminated here — put this behind a
  reverse proxy / platform load balancer that terminates TLS, and set
  `NODE_ENV=production` so cookies get `secure: true`.
- **Moderation wordlist**: `server/src/lib/moderation.js` ships a tiny,
  clearly-labeled example list — swap it for a maintained blocklist or a
  moderation API before running this for real.

## Data model

SQLite via `better-sqlite3` (see `server/src/db/index.js` for the full
schema): `users`, `dive_stats`, `portal_discoveries`, `template_stats`,
`comments`, `comment_reports`, `comment_quota`, plus a `sessions` table
owned by the custom session store. Swapping in Postgres later is mostly a
matter of replacing the `db/` module — every query already goes through
parameterized prepared statements, so the call sites barely change.

## Known limitations / good next steps

- Word banks (`content/wordbanks.ts`) are a curated starter set (~15 lines
  per tone) — genuinely infinite *variety* of copy would mean growing these
  banks a lot, or generating text from a model instead of fixed banks.
  Repetition becomes noticeable over a very long single session.
- The generative audio engine is deliberately simple (a handful of
  oscillators per zone) rather than a mixed/mastered soundtrack — it's
  built to *never need an asset pipeline*, not to be a finished score.
- There's no admin UI for the moderator queue yet — `GET /api/comments/flagged`
  and `POST /api/comments/:id/remove` exist and work, but only via direct
  API calls from a mod account today.
