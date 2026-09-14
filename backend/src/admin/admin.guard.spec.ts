import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { Request } from 'express';
import { AdminGuard } from './admin.guard';
import type { Identity } from '../identity/identity.types';

function buildContext(identity: Identity): ExecutionContext {
  const req = { identity } as Request & { identity: Identity };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const identity: Identity = {
  sub: 'sub-1',
  email: 'user@example.com',
  userId: 'user-1',
};

describe('AdminGuard', () => {
  it('allows an admin through', async () => {
    const findFirst = jest.fn().mockResolvedValue({ isAdmin: true });
    const guard = new AdminGuard({ query: { users: { findFirst } } } as never);

    await expect(guard.canActivate(buildContext(identity))).resolves.toBe(
      true,
    );
  });

  it('rejects a non-admin with 403', async () => {
    const findFirst = jest.fn().mockResolvedValue({ isAdmin: false });
    const guard = new AdminGuard({ query: { users: { findFirst } } } as never);

    await expect(guard.canActivate(buildContext(identity))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies rather than throws when req.identity.userId matches no row', async () => {
    const findFirst = jest.fn().mockResolvedValue(undefined);
    const guard = new AdminGuard({ query: { users: { findFirst } } } as never);

    await expect(guard.canActivate(buildContext(identity))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('looks up the user by the id IdentityGuard already resolved, not the sub', async () => {
    const findFirst = jest.fn().mockResolvedValue({ isAdmin: true });
    const guard = new AdminGuard({ query: { users: { findFirst } } } as never);

    await guard.canActivate(buildContext(identity));

    const [{ where }] = findFirst.mock.calls[0] as [{ where: SQL }];
    const { params } = new PgDialect().sqlToQuery(where);
    expect(params).toContain(identity.userId);
    expect(params).not.toContain(identity.sub);
  });
});
