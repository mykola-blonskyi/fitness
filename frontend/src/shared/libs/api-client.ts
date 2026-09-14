import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import type { Identity } from '@shared/types/identity';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Server-side fetch wrapper for the internal-only NestJS API (ADR-001 — the
// frontend never talks to Postgres directly, this is the sole path).
// The browser never calls this directly; it's used from Server
// Components/Actions and route handlers.
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  identity?: Identity,
): Promise<T> {
  let sub: string | null = identity?.sub ?? null;
  let email: string | null = identity?.email ?? null;

  if (!identity) {
    // Routes covered by proxy.ts's matcher already have these injected
    // into the request headers; read them back out here.
    const headerList = await headers();
    sub = headerList.get('x-user-id');
    email = headerList.get('x-user-email');
  }

  // Only the UUID, never email - ADR-006, this app handles real health
  // data and Sentry is a third-party service.
  if (sub) Sentry.setUser({ id: sub });

  let res: Response;
  try {
    res = await fetch(`${process.env.BACKEND_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(sub ? { 'x-user-id': sub } : {}),
        ...(email ? { 'x-user-email': email } : {}),
        ...init?.headers,
      },
      cache: 'no-store',
    });
  } catch (err) {
    // A refused connection throws a bare TypeError with no status, which
    // form-action.ts would swallow and the offline queue would read as a
    // refusal on the merits.
    throw new ApiError(503, `API request to ${path} could not be sent`, {
      cause: err,
    });
  }

  if (!res.ok) {
    // NestJS's HttpException body carries a `message` (string or, for
    // class-validator failures, string[]) - surfaced here so a caller can
    // show the backend's actual rejection reason instead of a generic
    // "failed: 409" (e.g. admin-exercises' delete-in-use guard).
    const body: { message?: string | string[] } | undefined = await res
      .json()
      .catch(() => undefined);
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message;
    throw new ApiError(
      res.status,
      message ?? `API request to ${path} failed: ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// 404 is the expected "nothing yet" signal for the many endpoints backed
// by an optional row (a day's weigh-in, its Diet, its calorie target) -
// anything else is a real error and propagates.
export async function fetchOr404<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
