import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { CalorieTargetsService } from '../calorie-targets/calorie-targets.service';
import { DietPreferencesService } from '../diet-preferences/diet-preferences.service';
import type { DietType } from '../diet-preferences/diet-preference.types';
import type { ListFoodItemsDto } from '../food-items/dto/list-food-items.dto';
import {
  generationEligibleWhere,
  generationIneligibility,
} from '../food-items/food-eligibility';
import {
  FoodItemsService,
  type FoodItemPage,
} from '../food-items/food-items.service';
import { FoodPreferencesService } from '../food-preferences/food-preferences.service';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';
import { resolveUserLocale } from '../shared/locale';
import { UsersService } from '../users/users.service';
import {
  categoryNamesExcludedBy,
  proteinCategoriesFor,
  roleNamesExcludedBy,
} from './diet-preference-exclusions';
import { sumCountedTotals } from './diet-totals';
import {
  toDietResponse,
  type DietItemWithFoodRow,
  type DietResponse,
} from './diet.mapper';
import {
  MEAL_ROLE_CHAINS,
  resolveMealOrder,
  type FoodCandidate,
} from './diet.types';
import { ReorderDietMealsDto } from './dto/reorder-diet-meals.dto';
import { generateDietItems, gramsForCalories } from './greedy-heuristic';

function defaultPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type FoodItemRow = typeof schema.foodCalories.$inferSelect;

type Tx = Parameters<
  Parameters<NodePgDatabase<typeof schema>['transaction']>[0]
>[0];

@Injectable()
export class DietsService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly usersService: UsersService,
    private readonly calorieTargetsService: CalorieTargetsService,
    private readonly foodPreferencesService: FoodPreferencesService,
    private readonly dietPreferencesService: DietPreferencesService,
    private readonly foodItemsService: FoodItemsService,
  ) {}

  private async getTaxonomyIdMaps(): Promise<{
    roleIdByName: Map<string, string>;
    categoryIdByName: Map<string, string>;
  }> {
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

  private async withDietPreferenceExclusions(
    userId: string,
    base: ExclusionTargets,
    categoryIdByName: Map<string, string>,
    roleIdByName: Map<string, string>,
  ): Promise<{ merged: ExclusionTargets; dietTypes: DietType[] }> {
    const dietPreferences = await this.dietPreferencesService.list(userId);
    const dietTypes: DietType[] = dietPreferences.map((p) => p.dietType);

    const merged: ExclusionTargets = {
      category: new Set(base.category),
      subcategory: new Set(base.subcategory),
      role: new Set(base.role),
      food_item: new Set(base.food_item),
    };

    for (const categoryName of categoryNamesExcludedBy(dietTypes)) {
      const id = categoryIdByName.get(categoryName);
      if (id) merged.category.add(id);
    }
    for (const roleName of roleNamesExcludedBy(dietTypes)) {
      const id = roleIdByName.get(roleName);
      if (id) merged.role.add(id);
    }

    return { merged, dietTypes };
  }

  // A whole-role exclusion short-circuits to an empty candidate list
  // without that role taking part in the query. One query covers every
  // non-excluded role rather than one query per role - roleIdByName is a
  // bijection (food_roles.name is unique), so each role id maps back to
  // exactly one role name. The pool is the user's favorites and nothing
  // else (ADR-025); exclusions still apply on top, since a food can be
  // favorited and later excluded by a diet type.
  private async findCandidatesByRole(
    exclusions: ExclusionTargets,
    roleIdByName: Map<string, string>,
    favoriteFoodItemIds: ReadonlySet<string>,
  ): Promise<Map<string, FoodCandidate[]>> {
    const roleNames = [...new Set(MEAL_ROLE_CHAINS.flat())];

    const candidatesByRole = new Map<string, FoodCandidate[]>();
    const roleNameById = new Map<string, string>();
    for (const roleName of roleNames) {
      const roleId = roleIdByName.get(roleName);
      if (!roleId || exclusions.role.has(roleId)) {
        candidatesByRole.set(roleName, []);
        continue;
      }
      roleNameById.set(roleId, roleName);
      candidatesByRole.set(roleName, []);
    }

    const queryableRoleIds = [...roleNameById.keys()];
    if (queryableRoleIds.length === 0 || favoriteFoodItemIds.size === 0) {
      return candidatesByRole;
    }

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
          inArray(schema.foodCalories.roleId, queryableRoleIds),
          inArray(schema.foodCalories.id, [...favoriteFoodItemIds]),
          generationEligibleWhere(exclusions),
        ),
      );

    for (const row of rows) {
      // Excludes 0-calorie items (e.g. water) - greedy-heuristic.ts
      // divides by this value when portion-scaling.
      if (Number(row.caloriesPer100g) <= 0) continue;
      const roleName = roleNameById.get(row.roleId);
      if (!roleName) continue;
      candidatesByRole.get(roleName)!.push({
        id: row.id,
        caloriesPer100g: Number(row.caloriesPer100g),
        proteinPer100g: Number(row.proteinPer100g),
        carbsPer100g: Number(row.carbsPer100g),
        fatPer100g: Number(row.fatPer100g),
        familyName: row.familyName,
        categoryName: row.categoryName,
      });
    }

    return candidatesByRole;
  }

  // Shared by generation, the swap picker and swapItem()'s own check, so
  // "excluded during generation" and "rejected on swap" cannot drift apart.
  private async resolveExclusions(userId: string): Promise<{
    exclusions: ExclusionTargets;
    roleIdByName: Map<string, string>;
    dietTypes: DietType[];
  }> {
    const [foodPreferenceExclusions, taxonomyIds] = await Promise.all([
      this.foodPreferencesService.getExclusionTargets(userId),
      this.getTaxonomyIdMaps(),
    ]);
    const { merged: exclusions, dietTypes } =
      await this.withDietPreferenceExclusions(
        userId,
        foodPreferenceExclusions,
        taxonomyIds.categoryIdByName,
        taxonomyIds.roleIdByName,
      );
    return { exclusions, roleIdByName: taxonomyIds.roleIdByName, dietTypes };
  }

  // Shared by findCurrent()'s and swapItem()'s lookup of the algorithm a
  // stored Diet row was generated with - which may be an older algorithm
  // than the one CalorieTargetsService currently looks up by code, since
  // Diet rows are never migrated when the registered algorithm changes.
  private async getAlgorithmById(id: string) {
    const algorithm = await this.db.query.dietCalculationAlgorithms.findFirst({
      where: eq(schema.dietCalculationAlgorithms.id, id),
    });
    if (!algorithm) {
      throw new NotFoundException('Calorie algorithm not configured');
    }
    return algorithm;
  }

  async generate(userId: string): Promise<DietResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Profile not created yet');
    }

    // Reuses the algorithm row computeForUser() already fetched (by code,
    // the currently-registered one) instead of a second lookup for it.
    const target = await this.calorieTargetsService.computeForUser(userId);
    const algorithm = target.algorithm;

    const [{ exclusions, roleIdByName, dietTypes }, favoriteFoodItemIds] =
      await Promise.all([
        this.resolveExclusions(userId),
        this.foodPreferencesService.getFavoriteFoodItemIds(userId),
      ]);
    if (favoriteFoodItemIds.size === 0) {
      throw new UnprocessableEntityException(
        'Add favorite food items before generating a menu',
      );
    }

    const candidatesByRole = await this.findCandidatesByRole(
      exclusions,
      roleIdByName,
      favoriteFoodItemIds,
    );
    const hasAnyCandidate = [...candidatesByRole.values()].some(
      (candidates) => candidates.length > 0,
    );
    if (!hasAnyCandidate) {
      throw new UnprocessableEntityException(
        'No food items available that match your food and diet preferences',
      );
    }

    const generated = generateDietItems({
      targetCalories: target.calories,
      targetProteinG: target.proteinG,
      targetCarbsG: target.carbsG,
      targetFatG: target.fatG,
      mealCount: user.mealCount,
      candidatesByRole,
      proteinCategories: proteinCategoriesFor(dietTypes),
    });

    const dietRow = await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.diets)
        .values({
          userId,
          algorithmId: algorithm.id,
          totalCalories: generated.totalCalories.toString(),
          totalProtein: generated.totalProtein.toString(),
          totalCarbs: generated.totalCarbs.toString(),
          totalFat: generated.totalFat.toString(),
          calculationMetadata: {
            algorithmCode: algorithm.code,
            targetCalories: target.calories,
            targetProteinG: target.proteinG,
            targetCarbsG: target.carbsG,
            targetFatG: target.fatG,
            freeFoodCalories: generated.freeFoodCalories,
            fittedCalorieTarget: generated.fittedCalorieTarget,
            fittedProteinTarget: generated.fittedProteinTarget,
            fittedCarbsTarget: generated.fittedCarbsTarget,
            fittedFatTarget: generated.fittedFatTarget,
            mealCount: user.mealCount,
          },
        })
        .returning();

      if (generated.items.length > 0) {
        await tx.insert(schema.dietItems).values(
          generated.items.map((item) => ({
            dietId: inserted.id,
            foodItemId: item.foodItemId,
            mealPosition: item.mealPosition,
            weightGrams: item.weightGrams.toString(),
            orderIndex: item.orderIndex,
            isCounted: item.isCounted,
          })),
        );
      }

      return inserted;
    });

    return this.buildResponse(dietRow, algorithm);
  }

  // Most recently created Diet row for the user, not a stored is_current
  // flag; older Diets are kept as history.
  async findCurrent(userId: string): Promise<DietResponse> {
    const dietRow = await this.db.query.diets.findFirst({
      where: eq(schema.diets.userId, userId),
      orderBy: desc(schema.diets.createdAt),
    });
    if (!dietRow) {
      throw new NotFoundException('No Diet generated yet');
    }

    const algorithm = await this.getAlgorithmById(dietRow.algorithmId);
    return this.buildResponse(dietRow, algorithm);
  }

  private async findOwnedDiet(
    userId: string,
    dietId: string,
  ): Promise<typeof schema.diets.$inferSelect> {
    const diet = await this.db.query.diets.findFirst({
      where: and(eq(schema.diets.id, dietId), eq(schema.diets.userId, userId)),
    });
    if (!diet) {
      throw new NotFoundException('Diet not found');
    }
    return diet;
  }

  private async resolveExplicitReplacement(
    foodItemId: string,
    currentFoodItem: FoodItemRow,
    exclusions: ExclusionTargets,
    favoriteFoodItemIds: ReadonlySet<string>,
  ): Promise<FoodItemRow> {
    const replacement = await this.db.query.foodCalories.findFirst({
      where: eq(schema.foodCalories.id, foodItemId),
    });
    if (!replacement) {
      throw new NotFoundException('Food item not found');
    }
    if (replacement.roleId !== currentFoodItem.roleId) {
      throw new BadRequestException(
        'Replacement must share the same Food Role as the item being swapped',
      );
    }
    if (!favoriteFoodItemIds.has(replacement.id)) {
      throw new UnprocessableEntityException(
        'A swap offers your favorite food items only - favorite this one first',
      );
    }
    // gramsForCalories divides by this - a 0-calorie item can't be portioned.
    if (Number(replacement.caloriesPer100g) <= 0) {
      throw new UnprocessableEntityException(
        'That food item has no calories and cannot be portioned into a menu',
      );
    }
    const ineligibility = generationIneligibility(replacement, exclusions);
    if (ineligibility === 'no_family') {
      throw new UnprocessableEntityException(
        'That food item is never used in a generated menu and cannot replace this one',
      );
    }
    if (ineligibility === 'preference_excluded') {
      throw new UnprocessableEntityException(
        'This replacement violates an active food preference',
      );
    }
    return replacement;
  }

  // Deliberately unrestricted by the favorites: reroll is the way out of
  // them, and swap is the way inside them (ADR-025).
  private async pickRerollReplacement(
    currentFoodItem: FoodItemRow,
    exclusions: ExclusionTargets,
    pickRandom: <T>(items: T[]) => T,
  ): Promise<FoodItemRow> {
    if (exclusions.role.has(currentFoodItem.roleId)) {
      throw new UnprocessableEntityException(
        'No other food item in this role matches your preferences',
      );
    }

    const sameRoleRows = await this.db.query.foodCalories.findMany({
      where: and(
        eq(schema.foodCalories.roleId, currentFoodItem.roleId),
        ne(schema.foodCalories.id, currentFoodItem.id),
        generationEligibleWhere(exclusions),
      ),
    });
    // 0-calorie items can't be portion-scaled - same exclusion generate makes.
    const candidates = sameRoleRows.filter(
      (row) => Number(row.caloriesPer100g) > 0,
    );
    if (candidates.length === 0) {
      throw new UnprocessableEntityException(
        'No other food item in this role matches your preferences',
      );
    }

    return pickRandom(candidates);
  }

  // Narrowed to what swapItem() will actually accept, so the picker cannot
  // offer an item that then 422s.
  async listSwapCandidates(
    userId: string,
    params: ListFoodItemsDto,
  ): Promise<FoodItemPage> {
    const [{ exclusions }, favoriteFoodItemIds] = await Promise.all([
      this.resolveExclusions(userId),
      this.foodPreferencesService.getFavoriteFoodItemIds(userId),
    ]);
    return this.foodItemsService.list(userId, params, {
      exclusions,
      favoriteFoodItemIds,
    });
  }

  // Omitted foodItemId = reroll (random same-Role candidate); either way
  // the replacement's grams are rescaled to hold calories - ADR-011.
  async swapItem(
    userId: string,
    dietId: string,
    itemId: string,
    foodItemId?: string,
    pickRandom: <T>(items: T[]) => T = defaultPick,
  ): Promise<DietResponse> {
    const { diet, dietItem } = await this.findOwnedDietItem(
      userId,
      dietId,
      itemId,
    );

    // A swap never revisits is_counted, so the new food would go uncounted.
    if (!dietItem.isCounted) {
      throw new UnprocessableEntityException(
        'A Free Food is served at a fixed portion and cannot be swapped',
      );
    }

    const currentFoodItem = await this.db.query.foodCalories.findFirst({
      where: eq(schema.foodCalories.id, dietItem.foodItemId),
    });
    // Unreachable in practice - dietItem.foodItemId is a not-null FK.
    if (!currentFoodItem) {
      throw new NotFoundException('Original food item not found');
    }

    const { exclusions } = await this.resolveExclusions(userId);

    const replacement = foodItemId
      ? await this.resolveExplicitReplacement(
          foodItemId,
          currentFoodItem,
          exclusions,
          await this.foodPreferencesService.getFavoriteFoodItemIds(userId),
        )
      : await this.pickRerollReplacement(
          currentFoodItem,
          exclusions,
          pickRandom,
        );

    const swappedKcal =
      (Number(currentFoodItem.caloriesPer100g) * Number(dietItem.weightGrams)) /
      100;
    const newGrams = gramsForCalories(
      { caloriesPer100g: Number(replacement.caloriesPer100g) },
      swappedKcal,
    );

    const updatedDiet = await this.db.transaction(async (tx) => {
      await tx
        .update(schema.dietItems)
        .set({ foodItemId: replacement.id, weightGrams: newGrams.toString() })
        .where(eq(schema.dietItems.id, dietItem.id));

      return this.recalculateTotals(tx, diet.id);
    });

    const algorithm = await this.getAlgorithmById(updatedDiet.algorithmId);
    return this.buildResponse(updatedDiet, algorithm);
  }

  private async findOwnedDietItem(
    userId: string,
    dietId: string,
    itemId: string,
  ): Promise<{
    diet: typeof schema.diets.$inferSelect;
    dietItem: typeof schema.dietItems.$inferSelect;
  }> {
    const diet = await this.findOwnedDiet(userId, dietId);
    const dietItem = await this.db.query.dietItems.findFirst({
      where: and(
        eq(schema.dietItems.id, itemId),
        eq(schema.dietItems.dietId, diet.id),
      ),
    });
    if (!dietItem) {
      throw new NotFoundException('Diet item not found');
    }
    return { diet, dietItem };
  }

  // Re-derives totals from every remaining item rather than adjusting by the
  // edited item's delta, so they can never drift from what the items sum to.
  private async recalculateTotals(
    tx: Tx,
    dietId: string,
  ): Promise<typeof schema.diets.$inferSelect> {
    const itemRows = await tx
      .select({
        weightGrams: schema.dietItems.weightGrams,
        isCounted: schema.dietItems.isCounted,
        caloriesPer100g: schema.foodCalories.caloriesPer100g,
        proteinPer100g: schema.foodCalories.proteinPer100g,
        carbsPer100g: schema.foodCalories.carbsPer100g,
        fatPer100g: schema.foodCalories.fatPer100g,
      })
      .from(schema.dietItems)
      .innerJoin(
        schema.foodCalories,
        eq(schema.foodCalories.id, schema.dietItems.foodItemId),
      )
      .where(eq(schema.dietItems.dietId, dietId));

    const totals = sumCountedTotals(itemRows);

    const [updated] = await tx
      .update(schema.diets)
      .set({
        totalCalories: Math.round(totals.calories).toString(),
        totalProtein: Math.round(totals.proteinG).toString(),
        totalCarbs: Math.round(totals.carbsG).toString(),
        totalFat: Math.round(totals.fatG).toString(),
      })
      .where(eq(schema.diets.id, dietId))
      .returning();

    return updated;
  }

  // Free Foods included: they are uncounted, so dropping one only changes
  // what the day asks the user to eat, not the totals.
  async removeItem(
    userId: string,
    dietId: string,
    itemId: string,
  ): Promise<DietResponse> {
    const { diet, dietItem } = await this.findOwnedDietItem(
      userId,
      dietId,
      itemId,
    );

    const updatedDiet = await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.dietItems)
        .where(eq(schema.dietItems.id, dietItem.id));
      return this.recalculateTotals(tx, diet.id);
    });

    const algorithm = await this.getAlgorithmById(updatedDiet.algorithmId);
    return this.buildResponse(updatedDiet, algorithm);
  }

  // The full, exact-set list of this diet's meal_position values in the
  // desired display order - same reorder convention as
  // training-programs.service.ts's reorderExercises. mealPosition doubles
  // as the meal's stable identifier (see ADR-017); mealPosition itself,
  // and every diet_item's role/macros, are untouched by this.
  async reorderMeals(
    userId: string,
    dietId: string,
    dto: ReorderDietMealsDto,
  ): Promise<DietResponse> {
    const diet = await this.findOwnedDiet(userId, dietId);

    const existing = await this.db
      .selectDistinct({ mealPosition: schema.dietItems.mealPosition })
      .from(schema.dietItems)
      .where(eq(schema.dietItems.dietId, diet.id));
    const existingPositions = new Set(existing.map((row) => row.mealPosition));

    const providedPositions = new Set(dto.orderedMealPositions);
    const isExactMatch =
      dto.orderedMealPositions.length === existingPositions.size &&
      providedPositions.size === existingPositions.size &&
      dto.orderedMealPositions.every((position) =>
        existingPositions.has(position),
      );
    if (!isExactMatch) {
      throw new BadRequestException(
        "orderedMealPositions must contain exactly this diet's meal positions, each once",
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.dietMealOrder)
        .where(eq(schema.dietMealOrder.dietId, diet.id));
      await tx.insert(schema.dietMealOrder).values(
        dto.orderedMealPositions.map((mealPosition, index) => ({
          dietId: diet.id,
          mealPosition,
          displayOrder: index,
        })),
      );
    });

    const algorithm = await this.db.query.dietCalculationAlgorithms.findFirst({
      where: eq(schema.dietCalculationAlgorithms.id, diet.algorithmId),
    });
    if (!algorithm) {
      throw new NotFoundException('Calorie algorithm not configured');
    }

    return this.buildResponse(diet, algorithm);
  }

  private async buildResponse(
    dietRow: typeof schema.diets.$inferSelect,
    // Pick, not the full row type - generate() passes the algorithm
    // subset CalorieTargetResponse carries (see computeForUser), which
    // has no createdAt.
    algorithm: Pick<
      typeof schema.dietCalculationAlgorithms.$inferSelect,
      'code' | 'name'
    >,
  ): Promise<DietResponse> {
    const locale = await resolveUserLocale(this.db, dietRow.userId);

    const rows = await this.db
      .select({
        id: schema.dietItems.id,
        mealPosition: schema.dietItems.mealPosition,
        orderIndex: schema.dietItems.orderIndex,
        weightGrams: schema.dietItems.weightGrams,
        isCounted: schema.dietItems.isCounted,
        foodItemId: schema.foodCalories.id,
        foodItemName: schema.foodCalories.name,
        translatedName: schema.foodCalorieTranslations.name,
        foodItemImageUrl: schema.foodCalories.imageUrl,
        foodItemRole: schema.foodRoles.name,
        caloriesPer100g: schema.foodCalories.caloriesPer100g,
        proteinPer100g: schema.foodCalories.proteinPer100g,
        carbsPer100g: schema.foodCalories.carbsPer100g,
        fatPer100g: schema.foodCalories.fatPer100g,
      })
      .from(schema.dietItems)
      .innerJoin(
        schema.foodCalories,
        eq(schema.foodCalories.id, schema.dietItems.foodItemId),
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
      .where(eq(schema.dietItems.dietId, dietRow.id))
      .orderBy(schema.dietItems.mealPosition, schema.dietItems.orderIndex);

    const itemRows: DietItemWithFoodRow[] = rows.map(
      ({ translatedName, ...row }) => ({
        ...row,
        foodItemName: translatedName ?? row.foodItemName,
      }),
    );

    const orderRows = await this.db
      .select({
        mealPosition: schema.dietMealOrder.mealPosition,
        displayOrder: schema.dietMealOrder.displayOrder,
      })
      .from(schema.dietMealOrder)
      .where(eq(schema.dietMealOrder.dietId, dietRow.id));

    const mealPositions = [...new Set(itemRows.map((row) => row.mealPosition))];
    const mealOrder = resolveMealOrder(mealPositions, orderRows);

    return toDietResponse(dietRow, algorithm, itemRows, mealOrder);
  }
}
