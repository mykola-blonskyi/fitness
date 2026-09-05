import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { toUserResponse, UserResponse } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: string): Promise<UserResponse | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
    return user ? toUserResponse(user) : null;
  }

  // The email fallback carries pre-conversion rows over: their backfilled
  // identity_sub is a Hub id that no real login `sub` can match (ADR-018).
  async findByIdentity(
    sub: string,
    email: string,
  ): Promise<UserResponse | null> {
    const bySub = await this.db.query.users.findFirst({
      where: eq(schema.users.identitySub, sub),
    });
    if (bySub) {
      return toUserResponse(bySub);
    }

    // Case-insensitive: login's email claim casing isn't guaranteed to match
    // whatever case a pre-conversion row happened to be stored in.
    const byEmail = await this.db.query.users.findFirst({
      where: eq(sql`lower(${schema.users.email})`, email.toLowerCase()),
    });
    if (!byEmail) {
      return null;
    }

    const [reconciled] = await this.db
      .update(schema.users)
      .set({ identitySub: sub, email, updatedAt: new Date() })
      .where(eq(schema.users.id, byEmail.id))
      .returning();

    return toUserResponse(reconciled);
  }

  async create(
    sub: string,
    email: string,
    dto: CreateUserDto,
  ): Promise<UserResponse> {
    const existing = await this.db.query.users.findFirst({
      where: eq(schema.users.identitySub, sub),
    });
    if (existing) {
      throw new ConflictException('Profile already exists');
    }

    const [created] = await this.db
      .insert(schema.users)
      .values({
        identitySub: sub,
        email,
        name: dto.name,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth,
        height: dto.height.toString(),
        goal: dto.goal,
        activityLevel: dto.activityLevel,
        avatarUrl: dto.avatarUrl,
        ...(dto.mealCount !== undefined ? { mealCount: dto.mealCount } : {}),
        locale: dto.locale,
        defaultWeightUnit: dto.defaultWeightUnit,
      })
      .returning();

    return toUserResponse(created);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const existing = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    const { height, ...rest } = dto;
    const [updated] = await this.db
      .update(schema.users)
      .set({
        ...rest,
        ...(height !== undefined ? { height: height.toString() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    return toUserResponse(updated);
  }
}
