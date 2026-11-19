import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { isUniqueViolation } from '../shared/db-errors';
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

  async findByIdentity(sub: string): Promise<UserResponse | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.identitySub, sub),
    });
    return user ? toUserResponse(user) : null;
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

    let created: typeof schema.users.$inferSelect;
    try {
      [created] = await this.db
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
          healthDataConsentAt: new Date(),
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Profile already exists');
      }
      throw err;
    }

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

  async exportRow(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
    if (!user) {
      throw new NotFoundException('Profile not found');
    }
    return user;
  }

  // Cascades to the user's rows; AccountService.delete says what must go first.
  async remove(id: string): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }
}
