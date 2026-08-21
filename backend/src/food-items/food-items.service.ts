import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import type { CreateFoodItemDto } from './dto/create-food-item.dto';
import {
  toFoodItemResponse,
  type FoodItemResponse,
  type TaxonomyResponse,
} from './food-item.mapper';

const DEFAULT_LOCALE = 'en';

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
};

@Injectable()
export class FoodItemsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Browse by category and/or search by name, with each item's display
  // name resolved to the requested locale - falling back to the English
  // base name when no translation row exists yet (untranslated or the
  // locale itself is 'en', which never gets its own translation row -
  // see knowledge/domain-model.md).
  async list(params: {
    category?: string;
    search?: string;
    locale?: string;
  }): Promise<FoodItemResponse[]> {
    const locale = params.locale ?? DEFAULT_LOCALE;

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
          params.category
            ? eq(schema.foodCategories.name, params.category)
            : undefined,
          params.search
            ? ilike(schema.foodCalories.name, `%${params.search}%`)
            : undefined,
        ),
      )
      .orderBy(schema.foodCalories.name);

    return rows.map((row) =>
      toFoodItemResponse({ ...row, name: row.translatedName ?? row.name }),
    );
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

  // source/sourceId stay null (unlike seeded rows) and isVerified stays
  // at its schema default (false) - a manually typed macro value is no
  // more trustworthy than an imported one until a reviewer confirms it,
  // same convention as `exercises`.
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
