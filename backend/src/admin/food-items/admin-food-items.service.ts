import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, gt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import * as schema from '../../db/schema';
import { checkDeleteGuard } from '../delete-guard';
import { decodeCursor, encodeCursor } from '../cursor-pagination';
import type { ListAdminFoodItemsDto } from './dto/list-admin-food-items.dto';
import {
  toAdminFoodItemResponse,
  type AdminFoodItemResponse,
} from './admin-food-item.mapper';

const DEFAULT_LIMIT = 20;

export interface AdminFoodItemPage {
  items: AdminFoodItemResponse[];
  nextCursor: string | null;
}

const foodItemColumns = {
  id: schema.foodCalories.id,
  name: schema.foodCalories.name,
  category: schema.foodCategories.name,
  subcategory: schema.foodSubcategories.name,
  role: schema.foodRoles.name,
  caloriesPer100g: schema.foodCalories.caloriesPer100g,
  proteinPer100g: schema.foodCalories.proteinPer100g,
  carbsPer100g: schema.foodCalories.carbsPer100g,
  fatPer100g: schema.foodCalories.fatPer100g,
  imageUrl: schema.foodCalories.imageUrl,
  isVerified: schema.foodCalories.isVerified,
  source: schema.foodCalories.source,
  sourceId: schema.foodCalories.sourceId,
  createdAt: schema.foodCalories.createdAt,
};

@Injectable()
export class AdminFoodItemsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Fetches one extra row to detect a next page without a separate count.
  async list(query: ListAdminFoodItemsDto): Promise<AdminFoodItemPage> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    if (query.cursor && !cursor) {
      throw new BadRequestException('Invalid cursor');
    }

    const rows = await this.db
      .select(foodItemColumns)
      .from(schema.foodCalories)
      .innerJoin(
        schema.foodCategories,
        eq(schema.foodCategories.id, schema.foodCalories.categoryId),
      )
      .innerJoin(
        schema.foodSubcategories,
        eq(schema.foodSubcategories.id, schema.foodCalories.subcategoryId),
      )
      .innerJoin(
        schema.foodRoles,
        eq(schema.foodRoles.id, schema.foodCalories.roleId),
      )
      .where(
        and(
          eq(schema.foodCalories.isVerified, false),
          cursor
            ? or(
                gt(schema.foodCalories.createdAt, new Date(cursor.createdAt)),
                and(
                  eq(schema.foodCalories.createdAt, new Date(cursor.createdAt)),
                  gt(schema.foodCalories.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(schema.foodCalories.createdAt), asc(schema.foodCalories.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map(toAdminFoodItemResponse),
      nextCursor:
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  async setVerified(
    id: string,
    isVerified: boolean,
  ): Promise<AdminFoodItemResponse> {
    const [updated] = await this.db
      .update(schema.foodCalories)
      .set({ isVerified })
      .where(eq(schema.foodCalories.id, id))
      .returning({ id: schema.foodCalories.id });

    if (!updated) {
      throw new NotFoundException('Food item not found');
    }

    const [row] = await this.db
      .select(foodItemColumns)
      .from(schema.foodCalories)
      .innerJoin(
        schema.foodCategories,
        eq(schema.foodCategories.id, schema.foodCalories.categoryId),
      )
      .innerJoin(
        schema.foodSubcategories,
        eq(schema.foodSubcategories.id, schema.foodCalories.subcategoryId),
      )
      .innerJoin(
        schema.foodRoles,
        eq(schema.foodRoles.id, schema.foodCalories.roleId),
      )
      .where(eq(schema.foodCalories.id, id));

    return toAdminFoodItemResponse(row);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db.query.foodCalories.findFirst({
      where: eq(schema.foodCalories.id, id),
      columns: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Food item not found');
    }

    const [{ value: usageCount }] = await this.db
      .select({ value: count() })
      .from(schema.dietItems)
      .where(eq(schema.dietItems.foodItemId, id));

    const guard = checkDeleteGuard('food item', 'diet item', usageCount);
    if (!guard.allowed) {
      throw new ConflictException(guard.reason);
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.foodCalorieTranslations)
        .where(eq(schema.foodCalorieTranslations.foodCalorieId, id));
      await tx
        .delete(schema.foodCalories)
        .where(eq(schema.foodCalories.id, id));
    });
  }
}
