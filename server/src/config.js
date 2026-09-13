import 'dotenv/config';

const required = (val, fallback, name) => {
  if (val) return val;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var ${name} in production`);
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
