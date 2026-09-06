import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { decodeCursor, encodeCursor } from '../admin/cursor-pagination';
import type { CreateFoodItemDto } from './dto/create-food-item.dto';
import type { ListFoodItemsDto } from './dto/list-food-items.dto';
import { resolveUserLocale } from '../shared/locale';
import {
  toFoodItemResponse,
  type FoodItemResponse,
  type TaxonomyResponse,
} from './food-item.mapper';

const DEFAULT_LIMIT = 20;

export interface FoodItemPage {
  items: FoodItemResponse[];
  nextCursor: string | null;
}

// Shared column projection for both list() and create()'s post-insert
// re-select - one place to add a new food_calories column so it can't go
// missing from just one of the two call sites.
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
  isVerified: schema.foodCalories.isVerified,
  imageUrl: schema.foodCalories.imageUrl,
  createdAt: schema.foodCalories.createdAt,
};

@Injectable()
export class FoodItemsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Browse by category and/or search by name, with each item's display
  // name resolved to the caller's stored locale - falling back to the
  // English base name when no translation row exists yet (untranslated or
  // the locale itself is 'en', which never gets its own translation row -
  // see knowledge/domain-model.md). Verified-only, cursor-paginated on
  // (createdAt, id) - same keyset machinery as AdminExercisesService.list().
  //
  // Newest-first (unlike the admin queue's oldest-first FIFO): a food
  // item created via the form below then lands on page 1 right away,
  // instead of at the tail of the full scroll.
  async list(userId: string, params: ListFoodItemsDto): Promise<FoodItemPage> {
    const locale = await resolveUserLocale(this.db, userId);
    const limit = params.limit ?? DEFAULT_LIMIT;
    const cursor = params.cursor ? decodeCursor(params.cursor) : null;
    if (params.cursor && !cursor) {
      throw new BadRequestException('Invalid cursor');
    }

    const rows = await this.db
      .select({
        ...foodItemColumns,
        translatedName: schema.foodCalorieTranslations.name,
      })
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
      .leftJoin(
        schema.foodCalorieTranslations,
        and(
          eq(
            schema.foodCalorieTranslations.foodCalorieId,
            schema.foodCalories.id,
          ),
          eq(schema.foodCalorieTranslations.locale, locale),
        ),
      )
      .where(
        and(
          eq(schema.foodCalories.isVerified, true),
          params.category
            ? eq(schema.foodCategories.name, params.category)
            : undefined,
          params.role ? eq(schema.foodRoles.name, params.role) : undefined,
          params.search
            ? or(
                ilike(schema.foodCalories.name, `%${params.search}%`),
                ilike(
                  schema.foodCalorieTranslations.name,
                  `%${params.search}%`,
                ),
              )
            : undefined,
          cursor
            ? or(
                lt(schema.foodCalories.createdAt, new Date(cursor.createdAt)),
                and(
                  eq(schema.foodCalories.createdAt, new Date(cursor.createdAt)),
                  lt(schema.foodCalories.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(
        desc(schema.foodCalories.createdAt),
        desc(schema.foodCalories.id),
      )
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map((row) =>
        toFoodItemResponse({ ...row, name: row.translatedName ?? row.name }),
      ),
      nextCursor:
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  // Powers the browse-by-category picker and the manual-creation form's
  // category/subcategory/role selects - the fixed taxonomy rows seeded
  // by seed-food-catalog.ts's upsertTaxonomy().
  async getTaxonomy(): Promise<TaxonomyResponse> {
    const [categories, subcategories, roles] = await Promise.all([
      this.db
        .select()
        .from(schema.foodCategories)
        .orderBy(schema.foodCategories.name),
      this.db
        .select()
        .from(schema.foodSubcategories)
        .orderBy(schema.foodSubcategories.name),
      this.db.select().from(schema.foodRoles).orderBy(schema.foodRoles.name),
    ]);

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        subcategories: subcategories
          .filter((sub) => sub.categoryId === category.id)
          .map((sub) => ({ id: sub.id, name: sub.name })),
      })),
      roles: roles.map((role) => ({ id: role.id, name: role.name })),
    };
  }

  // source/sourceId stay null (unlike seeded rows). isVerified is set
  // immediately, unlike imported rows - it already has an accountable
  // author, and must show up in the verified-only browse list right away.
  async create(dto: CreateFoodItemDto): Promise<FoodItemResponse> {
    const [inserted] = await this.db
      .insert(schema.foodCalories)
      .values({
        name: dto.name,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        roleId: dto.roleId,
        caloriesPer100g: String(dto.caloriesPer100g),
        proteinPer100g: String(dto.proteinPer100g),
        carbsPer100g: String(dto.carbsPer100g),
        fatPer100g: String(dto.fatPer100g),
        isVerified: true,
      })
      .returning();

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
      .where(eq(schema.foodCalories.id, inserted.id));

    return toFoodItemResponse(row);
  }
}
