// One definition of this app's own session cookie, shared by the write
// side (auth.ts's cookies.sessionToken) and the read side (identity.ts's
// getToken) — the two must agree exactly.
export const SESSION_COOKIE_NAME = 'authjs.session-token';
export const SESSION_COOKIE_SECURE = process.env.NODE_ENV === 'production';
