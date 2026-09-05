import type { Request } from 'express';
import { RequestIdentity } from './identity.types';

// NestJS is internal-only (private Docker network, unreachable from
// outside) and fully trusts these headers on that basis — it never
// verifies login.blonskyi.dev's token itself. See docs/decisions.md
// ADR-001 and ADR-018.
export function parseIdentity(req: Request): RequestIdentity | null {
  const sub = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];

  if (typeof sub !== 'string' || !sub || typeof email !== 'string' || !email) {
    return null;
  }

  return { sub, email };
}
