import { headers } from 'next/headers';
import type { Identity } from '@shared/types/identity';

// Server-side fetch wrapper for the internal-only NestJS API (ADR-001 — the
// frontend never talks to Postgres directly, this is the sole path).
// The browser never calls this directly; it's used from Server
// Components/Actions and route handlers.
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  identity?: Identity,
): Promise<T> {
  let userId: string | null = identity?.userId ?? null;
  let email: string | null = identity?.email ?? null;

  if (!identity) {
    // Routes covered by proxy.ts's matcher already have these injected
    // into the request headers; read them back out here.
    const headerList = await headers();
    userId = headerList.get('x-user-id');
    email = headerList.get('x-user-email');
  }

  const res = await fetch(`${process.env.BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(email ? { 'x-user-email': email } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`API request to ${path} failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
