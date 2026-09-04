import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IdentityGuard } from './identity.guard';
import { Identity } from './identity.types';

jest.mock('@sentry/nestjs', () => ({ setUser: jest.fn() }));
import * as Sentry from '@sentry/nestjs';

function buildContext(headers: Record<string, unknown>): {
  context: ExecutionContext;
  req: Request & { identity?: Identity };
} {
  const req = { headers } as unknown as Request & { identity?: Identity };
  const handler = () => {};
  class Controller {}
  const context = {
    getHandler: jest.fn().mockReturnValue(handler),
    getClass: jest.fn().mockReturnValue(Controller),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;

  return { context, req };
}

describe('IdentityGuard', () => {
  let getAllAndOverride: jest.Mock;
  let reflector: Reflector;
  let guard: IdentityGuard;

  beforeEach(() => {
    getAllAndOverride = jest.fn();
    reflector = { getAllAndOverride } as unknown as Reflector;
    guard = new IdentityGuard(reflector);
    (Sentry.setUser as jest.Mock).mockClear();
  });

  it('allows the request and attaches the parsed identity when headers are valid', () => {
    getAllAndOverride.mockReturnValue(false);
    const { context, req } = buildContext({
      'x-user-id': 'user-1',
      'x-user-email': 'user1@example.com',
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(req.identity).toEqual({
      hubUserId: 'user-1',
      email: 'user1@example.com',
    });
  });

  it('reports only the user id to Sentry, never the email', () => {
    getAllAndOverride.mockReturnValue(false);
    const { context } = buildContext({
      'x-user-id': 'user-1',
      'x-user-email': 'user1@example.com',
    });

    guard.canActivate(context);

    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-1' });
  });

  it('throws UnauthorizedException when the identity headers are missing', () => {
    getAllAndOverride.mockReturnValue(false);
    const { context } = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when x-user-id is present but x-user-email is missing', () => {
    getAllAndOverride.mockReturnValue(false);
    const { context } = buildContext({ 'x-user-id': 'user-1' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('does not attach an identity or call Sentry when the request is rejected', () => {
    getAllAndOverride.mockReturnValue(false);
    const { context, req } = buildContext({});

    expect(() => guard.canActivate(context)).toThrow();
    expect(req.identity).toBeUndefined();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('bypasses the identity check entirely for routes marked @Public()', () => {
    getAllAndOverride.mockReturnValue(true);
    const { context, req } = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
    expect(req.identity).toBeUndefined();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('reads the IS_PUBLIC_KEY metadata from both the handler and the class', () => {
    getAllAndOverride.mockReturnValue(true);
    const { context } = buildContext({});
    const handler = context.getHandler();
    const klass = context.getClass();

    guard.canActivate(context);

    expect(getAllAndOverride).toHaveBeenCalledWith('isPublic', [
      handler,
      klass,
    ]);
  });
});
