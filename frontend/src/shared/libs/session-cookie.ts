// Not the Auth.js default name: the Hub still sets its own
// `authjs.session-token` for `.blonskyi.dev`, which the browser also sends
// here. Duplicate names can't be told apart on the wire and the parser keeps
// the first one, so a same-named cookie would silently shadow this app's.
export const SESSION_COOKIE_NAME = 'fitness.session-token';
export const SESSION_COOKIE_SECURE = process.env.NODE_ENV === 'production';
