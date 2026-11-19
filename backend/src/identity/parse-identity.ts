import type { Request } from 'express';
import { IdentityHeaders } from './identity.types';

// Trusted once IdentityGuard has checked the frontend's shared secret — the
// backend never verifies login.blonskyi.dev's token itself (ADR-001, ADR-018).
export function parseIdentity(req: Request): IdentityHeaders | null {
  const sub = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];

  if (typeof sub !== 'string' || !sub || typeof email !== 'string' || !email) {
    return null;
  }

  return { sub, email };
}
