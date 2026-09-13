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
  cookieSecure: process.env.NODE_ENV === 'production',
  commentMonthlyLimit: Number(process.env.COMMENT_MONTHLY_LIMIT || 100),
};
