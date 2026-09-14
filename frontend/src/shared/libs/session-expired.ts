// Next's Server Action client follows a redirect silently, but rejects a
// text/plain 4xx with an Error carrying the body verbatim - hence this body.
export const SESSION_EXPIRED_BODY = 'fitness/session-expired';

// A Server Action POSTs to the page's own URL, so only this header tells it
// apart from a navigation.
export function isServerActionRequest(req: {
  method: string;
  headers: Headers;
}): boolean {
  return req.method === 'POST' && req.headers.has('next-action');
}

export function isSessionExpiredError(err: unknown): boolean {
  return err instanceof Error && err.message === SESSION_EXPIRED_BODY;
}
