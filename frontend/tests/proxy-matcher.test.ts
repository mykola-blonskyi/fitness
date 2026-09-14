import { describe, expect, it } from 'vitest';
import { PROXY_MATCHER } from '@libs/proxy-matcher';

const pattern = new RegExp(`^${PROXY_MATCHER}$`);
const matches = (pathname: string) => pattern.test(pathname);

describe('proxy matcher', () => {
  it.each([
    '/en/diary',
    '/en/onboarding',
    '/en/workouts/f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    '/uk/settings/appearance',
  ])('proxies the app route %s', (path) => {
    expect(matches(path)).toBe(true);
  });

  // An unproxied app route forwards the client's own x-user-id to NestJS,
  // which trusts it unconditionally — so a dotted dynamic segment escaping
  // the matcher is an authentication bypass, not a cosmetic miss.
  it.each([
    '/en/workouts/a.b',
    '/en/workouts/x.png',
    '/en/training/1.0',
    '/en/photos/gallery/x.svg',
  ])('proxies %s, which still resolves to a dynamic route', (path) => {
    expect(matches(path)).toBe(true);
  });

  it.each([
    '/api/auth/signin',
    '/_next/static/chunks/main.js',
    '/_vercel/insights',
    '/favicon.ico',
    '/sw.js',
    '/manifest.webmanifest',
    '/apple-touch-icon.png',
    '/icons/icon-192.png',
    '/globe.svg',
  ])('skips the real asset %s', (path) => {
    expect(matches(path)).toBe(false);
  });
});
