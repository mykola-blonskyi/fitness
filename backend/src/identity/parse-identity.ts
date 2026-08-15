import type { Request } from 'express';
import { Identity } from './identity.types';

// NestJS is internal-only (private Docker network, unreachable from
// outside) and fully trusts these headers on that basis — it never
// re-verifies the Hub's JWT itself. See docs/decisions.md ADR-001.
export function parseIdentity(req: Request): Identity | null {
  const hubUserId = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];

  if (
    typeof hubUserId !== 'string' ||
    !hubUserId ||
    typeof email !== 'string' ||
    !email
  ) {
    return null;
  }

  return { hubUserId, email };
}
