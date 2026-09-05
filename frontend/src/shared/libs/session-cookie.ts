// The write side (auth.ts) and read side (identity.ts) must agree exactly.
export const SESSION_COOKIE_NAME = 'authjs.session-token';
export const SESSION_COOKIE_SECURE = process.env.NODE_ENV === 'production';
