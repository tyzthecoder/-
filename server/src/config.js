import 'dotenv/config';

const required = (val, fallback, name) => {
  if (val) return val;
  if (process.env.NODE_ENV === 'production') {
    // This is the #1 cause of "the start command isn't working" on a fresh
    // host deploy (Render, Railway, etc.): those platforms set
    // NODE_ENV=production for you automatically, so this fires unless you
    // explicitly set the var yourself in the dashboard's environment
    // settings — nothing wrong with the start script or the code path.
    throw new Error(
      `Missing required env var ${name} in production. ` +
        `Set it in your host's dashboard (e.g. Render → your service → ` +
        `Environment) — see server/.env.production for the full list this ` +
        `service needs.`
    );
  }
  return fallback;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: required(
    process.env.SESSION_SECRET,
    'dev-only-insecure-secret-change-me',
    'SESSION_SECRET'
  ),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // 'lax' works when client and API share a site (or are co-hosted behind
  // one domain). A split deployment — e.g. the client on Vercel and this
  // API on a separate host — is cross-site from the browser's point of
  // view, and cross-site cookies require SameSite=None + Secure, or the
  // session cookie simply won't be sent back on API calls. Set
  // COOKIE_SAME_SITE=none for that case.
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  get cookieSecure() {
    // SameSite=None is rejected by browsers unless Secure is also set, so
    // that combination forces it on regardless of NODE_ENV.
    return process.env.NODE_ENV === 'production' || this.cookieSameSite === 'none';
  },
  commentMonthlyLimit: Number(process.env.COMMENT_MONTHLY_LIMIT || 100),
};
