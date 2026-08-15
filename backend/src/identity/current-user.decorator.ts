import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { Identity } from './identity.types';

// Reads back the Identity that IdentityGuard already parsed and attached
// to the request — never re-parses headers itself.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Identity => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { identity: Identity }>();
    return req.identity;
  },
);
