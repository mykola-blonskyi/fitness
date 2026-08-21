import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import type { CreateFoodPreferenceDto } from './dto/create-food-preference.dto';
import {
  toFoodPreferenceResponse,
  type FoodPreferenceResponse,
} from './food-preference.mapper';
import type { FoodPreferenceTargetType } from './food-preference.types';

@Injectable()
export class FoodPreferencesService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // The four tables target_id polymorphically points at - see schema.ts's
  // comment on food_preferences.target_id for why this can't be a real
  // FK. Each table has its own distinct Drizzle type (they're not a
  // common supertype), so this is a switch rather than a lookup object -
  // that would need an unsound cast to type-check.
  private async fetchTargetNames(
    targetType: FoodPreferenceTargetType,
    ids: string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    switch (targetType) {
      case 'category': {
        const rows = await this.db
          .select({
            id: schema.foodCategories.id,
            name: schema.foodCategories.name,
          })
          .from(schema.foodCategories)
          .where(inArray(schema.foodCategories.id, ids));
        return new Map(rows.map((row) => [row.id, row.name]));
      }
      case 'subcategory': {
        const rows = await this.db
          .select({
            id: schema.foodSubcategories.id,
            name: schema.foodSubcategories.name,
          })
          .from(schema.foodSubcategories)
          .where(inArray(schema.foodSubcategories.id, ids));
        return new Map(rows.map((row) => [row.id, row.name]));
      }
      case 'role': {
        const rows = await this.db
          .select({ id: schema.foodRoles.id, name: schema.foodRoles.name })
          .from(schema.foodRoles)
          .where(inArray(schema.foodRoles.id, ids));
        return new Map(rows.map((row) => [row.id, row.name]));
      }
      case 'food_item': {
        const rows = await this.db
          .select({
            id: schema.foodCalories.id,
            name: schema.foodCalories.name,
          })
          .from(schema.foodCalories)
          .where(inArray(schema.foodCalories.id, ids));
        return new Map(rows.map((row) => [row.id, row.name]));
      }
    }
  }

  async list(userId: string): Promise<FoodPreferenceResponse[]> {
    const rows = await this.db
      .select()
      .from(schema.foodPreferences)
      .where(eq(schema.foodPreferences.userId, userId));

    // One lookup per distinct targetType instead of one per row - a user
    // with a dozen preferences of the same targetType still costs a
    // single extra query for that type.
    const namesByTargetType = new Map<
      FoodPreferenceTargetType,
      Map<string, string>
    >();
    for (const targetType of new Set(rows.map((row) => row.targetType))) {
      const ids = rows
        .filter((row) => row.targetType === targetType)
        .map((row) => row.targetId);
      namesByTargetType.set(
        targetType,
        await this.fetchTargetNames(targetType, ids),
      );
    }

    return rows.map((row) =>
      toFoodPreferenceResponse(
        row,
        namesByTargetType.get(row.targetType)?.get(row.targetId) ?? null,
      ),
    );
  }

  async create(
    userId: string,
    dto: CreateFoodPreferenceDto,
  ): Promise<FoodPreferenceResponse> {
    const targetNames = await this.fetchTargetNames(dto.targetType, [
      dto.targetId,
    ]);
    const targetName = targetNames.get(dto.targetId);
    // A truthy check here would wrongly reject a real target whose name
    // happens to be an empty string - Map.get()'s undefined is the only
    // real "not found" signal.
    if (targetName === undefined) {
      throw new BadRequestException(
        `No ${dto.targetType} found with id ${dto.targetId}`,
      );
    }

    const existing = await this.db.query.foodPreferences.findFirst({
      where: and(
        eq(schema.foodPreferences.userId, userId),
        eq(schema.foodPreferences.type, dto.type),
        eq(schema.foodPreferences.targetType, dto.targetType),
        eq(schema.foodPreferences.targetId, dto.targetId),
      ),
    });
    if (existing) {
      throw new ConflictException('This preference already exists');
    }

    const [inserted] = await this.db
      .insert(schema.foodPreferences)
      .values({
        userId,
        type: dto.type,
        targetType: dto.targetType,
        targetId: dto.targetId,
      })
      .returning();

    return toFoodPreferenceResponse(inserted, targetName);
  }

  async remove(userId: string, id: string): Promise<FoodPreferenceResponse> {
    const existing = await this.db.query.foodPreferences.findFirst({
      where: and(
        eq(schema.foodPreferences.id, id),
        eq(schema.foodPreferences.userId, userId),
      ),
    });
    if (!existing) {
      throw new NotFoundException('Food preference not found');
    }

    await this.db
      .delete(schema.foodPreferences)
      .where(eq(schema.foodPreferences.id, id));

    const targetName = (
      await this.fetchTargetNames(existing.targetType, [existing.targetId])
    ).get(existing.targetId);
    return toFoodPreferenceResponse(existing, targetName ?? null);
  }
}
