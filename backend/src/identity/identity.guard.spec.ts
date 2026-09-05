import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IdentityGuard } from './identity.guard';
import { ResolvedIdentity } from './identity.types';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { UsersService } from '../users/users.service';

jest.mock('@sentry/nestjs', () => ({ setUser: jest.fn() }));
import * as Sentry from '@sentry/nestjs';

function buildContext(headers: Record<string, unknown>): {
  context: ExecutionContext;
  req: Request & { identity?: ResolvedIdentity };
} {
  const req = { headers } as unknown as Request & {
    identity?: ResolvedIdentity;
  };
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

const validHeaders = {
  'x-user-id': 'sub-1',
  'x-user-email': 'user1@example.com',
};

describe('IdentityGuard', () => {
  let getAllAndOverride: jest.Mock;
  let findByIdentity: jest.Mock;
  let reflector: Reflector;
  let guard: IdentityGuard;

  // Public and profile-optional are separate metadata keys, so the mock
  // answers per key rather than returning one value for both.
  function metadata(flags: { public?: boolean; profileOptional?: boolean }) {
    getAllAndOverride.mockImplementation((key: string) =>
      key === IS_PUBLIC_KEY ? !!flags.public : !!flags.profileOptional,
    );
  }

  beforeEach(() => {
    getAllAndOverride = jest.fn();
    findByIdentity = jest.fn();
    reflector = { getAllAndOverride } as unknown as Reflector;
    guard = new IdentityGuard(reflector, {
      findByIdentity,
    } as unknown as UsersService);
    (Sentry.setUser as jest.Mock).mockClear();
    metadata({});
  });

  it('attaches the resolved local user id alongside the identity', async () => {
    findByIdentity.mockResolvedValue({ id: 'local-1' });
    const { context, req } = buildContext(validHeaders);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(findByIdentity).toHaveBeenCalledWith('sub-1', 'user1@example.com');
    expect(req.identity).toEqual({
      sub: 'sub-1',
      email: 'user1@example.com',
      userId: 'local-1',
    });
  });

  it('reports only the local user id to Sentry, never the email', async () => {
    findByIdentity.mockResolvedValue({ id: 'local-1' });
    const { context } = buildContext(validHeaders);

    await guard.canActivate(context);

    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'local-1' });
  });

  it('rejects an identity with no profile row on a normal route', async () => {
    findByIdentity.mockResolvedValue(null);
    const { context, req } = buildContext(validHeaders);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(req.identity).toBeUndefined();
  });

  it('allows an identity with no profile row on a @ProfileOptional() route', async () => {
    metadata({ profileOptional: true });
    findByIdentity.mockResolvedValue(null);
    const { context, req } = buildContext(validHeaders);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.identity).toEqual({
      sub: 'sub-1',
      email: 'user1@example.com',
      userId: null,
    });
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'sub-1' });
  });

  it('throws UnauthorizedException when the identity headers are missing', async () => {
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findByIdentity).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when x-user-id is present but x-user-email is missing', async () => {
    const { context } = buildContext({ 'x-user-id': 'sub-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('does not attach an identity or call Sentry when the request is rejected', async () => {
    const { context, req } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toThrow();
    expect(req.identity).toBeUndefined();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('bypasses the identity check entirely for routes marked @Public()', async () => {
    metadata({ public: true });
    const { context, req } = buildContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.identity).toBeUndefined();
    expect(findByIdentity).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('reads the IS_PUBLIC_KEY metadata from both the handler and the class', async () => {
    metadata({ public: true });
    const { context } = buildContext({});
    const handler = context.getHandler();
    const klass = context.getClass();

    await guard.canActivate(context);

    expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      klass,
    ]);
  });
});
