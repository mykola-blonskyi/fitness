import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { DEMO_IDENTITY_SUB, IS_NOT_FOR_DEMO_KEY } from './demo-identity';
import { IS_PROFILE_OPTIONAL_KEY } from './profile-optional.decorator';
import { ResolvedIdentity } from './identity.types';
import { parseIdentity } from './parse-identity';

const digest = (value: string) => createHash('sha256').update(value).digest();

// Unset on the backend fails closed: no header can match an empty secret.
function hasSharedSecret(req: Request): boolean {
  const expected = process.env.BACKEND_SECRET;
  const given = req.headers['x-backend-secret'];
  return (
    !!expected &&
    typeof given === 'string' &&
    timingSafeEqual(digest(given), digest(expected))
  );
}

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    if (!hasSharedSecret(req)) {
      throw new UnauthorizedException('Missing backend secret');
    }
    const parsed = parseIdentity(req);
    if (!parsed) {
      throw new UnauthorizedException('Missing trusted identity headers');
    }

    if (
      parsed.sub === DEMO_IDENTITY_SUB &&
      this.reflector.getAllAndOverride<boolean>(IS_NOT_FOR_DEMO_KEY, targets)
    ) {
      throw new ForbiddenException('Not available in the demo account');
    }

    // The one seam translating login's `sub` into this app's own
    // users.id — every other route reads identity.userId and never sees a
    // sub (ADR-018).
    const user = await this.usersService.findByIdentity(parsed.sub);
    const profileOptional = this.reflector.getAllAndOverride<boolean>(
      IS_PROFILE_OPTIONAL_KEY,
      targets,
    );
    if (!user && !profileOptional) {
      throw new UnauthorizedException('No profile for this identity');
    }

    const identity: ResolvedIdentity = { ...parsed, userId: user?.id ?? null };
    (req as Request & { identity: ResolvedIdentity }).identity = identity;
    // The sub, not userId, so backend and frontend events correlate to one
    // Sentry user. Never email - ADR-006, this app handles real health data.
    Sentry.setUser({ id: identity.sub });
    return true;
  }
}
