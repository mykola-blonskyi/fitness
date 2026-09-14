import { describe, expect, it } from 'vitest';
import {
  SESSION_EXPIRED_BODY,
  isServerActionRequest,
  isSessionExpiredError,
} from '@shared/libs/session-expired';

describe('isServerActionRequest', () => {
  it('matches the POST Next makes for a Server Action', () => {
    expect(
      isServerActionRequest({
        method: 'POST',
        headers: new Headers({ 'next-action': '7f3a' }),
      }),
    ).toBe(true);
  });

  it.each([
    ['GET', new Headers({ 'next-action': '7f3a' })],
    ['POST', new Headers()],
    ['GET', new Headers()],
  ])('does not match a %s without the pair of signals', (method, headers) => {
    expect(isServerActionRequest({ method, headers })).toBe(false);
  });
});

describe('isSessionExpiredError', () => {
  it('recognises the body the proxy answers an expired Server Action with', () => {
    expect(isSessionExpiredError(new Error(SESSION_EXPIRED_BODY))).toBe(true);
  });

  it.each([
    new Error('An unexpected response was received from the server.'),
    new TypeError('fetch failed'),
    SESSION_EXPIRED_BODY,
    undefined,
  ])('leaves %s alone', (value) => {
    expect(isSessionExpiredError(value)).toBe(false);
  });
});
