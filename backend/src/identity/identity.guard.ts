import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Identity } from './identity.types';
import { parseIdentity } from './parse-identity';

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const identity = parseIdentity(req);
    if (!identity) {
      throw new UnauthorizedException('Missing trusted identity headers');
    }

    (req as Request & { identity: Identity }).identity = identity;
    // Only the UUID, never email - ADR-006, this app handles real health
    // data and Sentry is a third-party service.
    Sentry.setUser({ id: identity.hubUserId });
    return true;
  }
}
