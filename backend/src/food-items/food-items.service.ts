import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, lt, ne, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { decodeCursor, encodeCursor } from '../admin/cursor-pagination';
import type {
  ExclusionTargets,
  FoodPreferenceTargetType,
} from '../food-preferences/food-preference.types';
import {
  generationEligibleWhere,
  slotEligibleWhere,
  type ReachabilityFacts,
  type SlotConstraint,
  type TaxonomyIds,
} from './food-eligibility';
import type { CreateFoodItemDto } from './dto/create-food-item.dto';
import type { ListFoodItemsDto } from './dto/list-food-items.dto';
import { resolveUserLocale } from '../shared/locale';
import {
  toFoodItemResponse,
  type FoodItemResponse,
  type TaxonomyResponse,
} from './food-item.mapper';
import type { FoodItemRow, GenerationCandidate } from './food-item.types';

const DEFAULT_LIMIT = 20;

export interface FoodItemPage {
  items: FoodItemResponse[];
  nextCursor: string | null;
}

// What generation would accept for this user: the swap picker passes it so
// it cannot offer an item swapItem() then rejects (ADR-025). The two travel
// together - offering the favorites unfiltered by exclusions would surface
// a food a diet type has since ruled out.
export interface GenerationScope {
  exclusions: ExclusionTargets;
  favoriteFoodItemIds: ReadonlySet<string>;
  slot: SlotConstraint;
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
  //
  // generationScope narrows the page to what generation would accept, for
  // the swap picker; browsing and logging a food stay unrestricted (ADR-020).
  async list(
    userId: string,
    params: ListFoodItemsDto,
    generationScope?: GenerationScope,
  ): Promise<FoodItemPage> {
    // inArray rejects an empty list, and an empty favorites set has
    // nothing to offer anyway.
    if (generationScope?.favoriteFoodItemIds.size === 0) {
      return { items: [], nextCursor: null };
    }

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
          generationScope
            ? and(
                generationEligibleWhere(generationScope.exclusions),
                slotEligibleWhere(generationScope.slot),
                inArray(schema.foodCalories.id, [
                  ...generationScope.favoriteFoodItemIds,
                ]),
              )
            : undefined,
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

  // Name-keyed, unlike getTaxonomy()'s nested response: generation starts
  // from a Role or Category name in code and needs its id.
  async getTaxonomyIds(): Promise<TaxonomyIds> {
    const [roleRows, categoryRows] = await Promise.all([
      this.db
        .select({ id: schema.foodRoles.id, name: schema.foodRoles.name })
        .from(schema.foodRoles),
      this.db
        .select({
          id: schema.foodCategories.id,
          name: schema.foodCategories.name,
        })
        .from(schema.foodCategories),
    ]);
    return {
      roleIdByName: new Map(roleRows.map((row) => [row.name, row.id])),
      categoryIdByName: new Map(categoryRows.map((row) => [row.name, row.id])),
    };
  }

  // The generation pool is the user's favorites and nothing else
  // (ADR-025); exclusions still apply on top, since a food can be
  // favorited and later excluded by a diet type.
  async findGenerationCandidates(
    roleIds: string[],
    favoriteFoodItemIds: ReadonlySet<string>,
    exclusions: ExclusionTargets,
  ): Promise<GenerationCandidate[]> {
    // inArray rejects an empty list.
    if (roleIds.length === 0 || favoriteFoodItemIds.size === 0) return [];

    const rows = await this.db
      .select({
        id: schema.foodCalories.id,
        roleId: schema.foodCalories.roleId,
        caloriesPer100g: schema.foodCalories.caloriesPer100g,
        proteinPer100g: schema.foodCalories.proteinPer100g,
        carbsPer100g: schema.foodCalories.carbsPer100g,
        fatPer100g: schema.foodCalories.fatPer100g,
        familyName: schema.foodFamilies.name,
        categoryName: schema.foodCategories.name,
      })
      .from(schema.foodCalories)
      .leftJoin(
        schema.foodFamilies,
        eq(schema.foodFamilies.id, schema.foodCalories.familyId),
      )
      .leftJoin(
        schema.foodCategories,
        eq(schema.foodCategories.id, schema.foodCalories.categoryId),
      )
      .where(
        and(
          inArray(schema.foodCalories.roleId, roleIds),
          inArray(schema.foodCalories.id, [...favoriteFoodItemIds]),
          generationEligibleWhere(exclusions),
        ),
      );

    return rows.map((row) => ({
      ...row,
      caloriesPer100g: Number(row.caloriesPer100g),
      proteinPer100g: Number(row.proteinPer100g),
      carbsPer100g: Number(row.carbsPer100g),
      fatPer100g: Number(row.fatPer100g),
    }));
  }

  // Unrestricted by the favorites, unlike findGenerationCandidates:
  // reroll is the way out of them (ADR-025).
  async findSlotCandidates(
    slot: SlotConstraint,
    exclusions: ExclusionTargets,
    excludeFoodItemId: string,
  ): Promise<FoodItemRow[]> {
    return this.db.query.foodCalories.findMany({
      where: and(
        slotEligibleWhere(slot),
        ne(schema.foodCalories.id, excludeFoodItemId),
        generationEligibleWhere(exclusions),
      ),
    });
  }

  async findRow(id: string): Promise<FoodItemRow | undefined> {
    return this.db.query.foodCalories.findFirst({
      where: eq(schema.foodCalories.id, id),
    });
  }

  // The four catalog tables a Food Preference's target_id can point at -
  // see schema.ts's comment on food_preferences.target_id for why that
  // can't be a real FK. Each table has its own distinct Drizzle type
  // (they're not a common supertype), so this is a switch rather than a
  // lookup object - that would need an unsound cast to type-check.
  async getTargetNames(
    userId: string,
    targetType: FoodPreferenceTargetType,
    ids: string[],
  ): Promise<Map<string, string>> {
    // inArray rejects an empty list.
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
        // The only target type with per-locale names - the three taxonomy
        // tables above have no translation table at all.
        const locale = await resolveUserLocale(this.db, userId);
        const rows = await this.db
          .select({
            id: schema.foodCalories.id,
            name: schema.foodCalories.name,
            translatedName: schema.foodCalorieTranslations.name,
          })
          .from(schema.foodCalories)
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
          .where(inArray(schema.foodCalories.id, ids));
        return new Map(
          rows.map((row) => [row.id, row.translatedName ?? row.name]),
        );
      }
    }
  }

  async getReachabilityFacts(
    ids: string[],
  ): Promise<Map<string, ReachabilityFacts>> {
    // inArray rejects an empty list.
    if (ids.length === 0) return new Map();

    const rows = await this.db
      .select({
        id: schema.foodCalories.id,
        familyId: schema.foodCalories.familyId,
        caloriesPer100g: schema.foodCalories.caloriesPer100g,
        roleName: schema.foodRoles.name,
        categoryName: schema.foodCategories.name,
      })
      .from(schema.foodCalories)
      .leftJoin(
        schema.foodRoles,
        eq(schema.foodRoles.id, schema.foodCalories.roleId),
      )
      .leftJoin(
        schema.foodCategories,
        eq(schema.foodCategories.id, schema.foodCalories.categoryId),
      )
      .where(inArray(schema.foodCalories.id, ids));

    return new Map(
      rows.map((row) => [
        row.id,
        {
          familyId: row.familyId,
          caloriesPer100g: Number(row.caloriesPer100g),
          roleName: row.roleName,
          categoryName: row.categoryName,
        },
      ]),
    );
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
