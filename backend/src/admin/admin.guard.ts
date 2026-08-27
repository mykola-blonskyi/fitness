import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Request } from 'express';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import type { Identity } from '../identity/identity.types';

// Applied per-controller (@UseGuards) on top of the global IdentityGuard,
// never in place of it - relies on IdentityGuard having already run and
// attached req.identity.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { identity: Identity }>();

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, req.identity.hubUserId),
      columns: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
