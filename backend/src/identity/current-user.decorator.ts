import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { Identity, ResolvedIdentity } from './identity.types';

// Reads back what IdentityGuard already resolved and attached to the
// request — never re-parses headers itself. userId is non-null because
// the guard rejects any route that isn't @ProfileOptional() when it
// can't resolve one.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Identity => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { identity: Identity }>();
    return req.identity;
  },
);

// The @ProfileOptional() counterpart, where userId may legitimately be
// null and the route has to handle that itself.
export const CurrentIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedIdentity => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { identity: ResolvedIdentity }>();
    return req.identity;
  },
);
