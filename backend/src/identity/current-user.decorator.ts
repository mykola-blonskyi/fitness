import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { Identity, ResolvedIdentity } from './identity.types';

// userId is non-null here only because IdentityGuard rejects any route
// that isn't @ProfileOptional() when it can't resolve one.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Identity => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { identity: Identity }>();
    return req.identity;
  },
);

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedIdentity => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { identity: ResolvedIdentity }>();
    return req.identity;
  },
);
