import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, notInArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { CalorieTargetsService } from '../calorie-targets/calorie-targets.service';
import { DietPreferencesService } from '../diet-preferences/diet-preferences.service';
import type { DietType } from '../diet-preferences/diet-preference.types';
import { FoodPreferencesService } from '../food-preferences/food-preferences.service';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';
import { UsersService } from '../users/users.service';
import {
  categoryNamesExcludedBy,
  roleNamesExcludedBy,
} from './diet-preference-exclusions';
import { restrictToFavorites } from './favorite-restriction';
import {
  toDietResponse,
  type DietItemWithFoodRow,
  type DietResponse,
} from './diet.mapper';
import { MEAL_ROLE_CHAINS, type FoodCandidate } from './diet.types';
import { generateDietItems, gramsForCalories } from './greedy-heuristic';
import { eligibleReplacements, isPreferenceExcluded } from './swap-candidates';

// Same registered code calorie-targets.service.ts looks up, so the two
// services' targets can never drift apart.
const ALGORITHM_CODE = 'mifflin_v1';

function defaultPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type FoodItemRow = typeof schema.foodCalories.$inferSelect;

@Injectable()
export class DietsService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly usersService: UsersService,
    private readonly calorieTargetsService: CalorieTargetsService,
    private readonly foodPreferencesService: FoodPreferencesService,
    private readonly dietPreferencesService: DietPreferencesService,
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
  ): Promise<ExclusionTargets> {
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

    return merged;
  }

  // A whole-role exclusion short-circuits to an empty candidate list
  // without a query.
  private async findCandidatesByRole(
    exclusions: ExclusionTargets,
    roleIdByName: Map<string, string>,
  ): Promise<Map<string, FoodCandidate[]>> {
    const roleNames = [...new Set(MEAL_ROLE_CHAINS.flat())];

    const excludedFoodItems = [...exclusions.food_item];
    const excludedCategories = [...exclusions.category];
    const excludedSubcategories = [...exclusions.subcategory];

    const candidatesByRole = new Map<string, FoodCandidate[]>();
    for (const roleName of roleNames) {
      const roleId = roleIdByName.get(roleName);
      if (!roleId || exclusions.role.has(roleId)) {
        candidatesByRole.set(roleName, []);
        continue;
      }

      const rows = await this.db
        .select({
          id: schema.foodCalories.id,
          caloriesPer100g: schema.foodCalories.caloriesPer100g,
          proteinPer100g: schema.foodCalories.proteinPer100g,
          carbsPer100g: schema.foodCalories.carbsPer100g,
          fatPer100g: schema.foodCalories.fatPer100g,
        })
        .from(schema.foodCalories)
        .where(
          and(
            eq(schema.foodCalories.roleId, roleId),
            excludedFoodItems.length > 0
              ? notInArray(schema.foodCalories.id, excludedFoodItems)
              : undefined,
            excludedCategories.length > 0
              ? notInArray(schema.foodCalories.categoryId, excludedCategories)
              : undefined,
            excludedSubcategories.length > 0
              ? notInArray(
                  schema.foodCalories.subcategoryId,
                  excludedSubcategories,
                )
              : undefined,
          ),
        );

      candidatesByRole.set(
        roleName,
        rows
          // Excludes 0-calorie items (e.g. water) - greedy-heuristic.ts
          // divides by this value when portion-scaling.
          .filter((row) => Number(row.caloriesPer100g) > 0)
          .map((row) => ({
            id: row.id,
            caloriesPer100g: Number(row.caloriesPer100g),
            proteinPer100g: Number(row.proteinPer100g),
            carbsPer100g: Number(row.carbsPer100g),
            fatPer100g: Number(row.fatPer100g),
          })),
      );
    }

    return candidatesByRole;
  }

  // Shared by generate()'s candidate query and swapItem()'s violation
  // check, so "excluded during generation" and "rejected on swap" can
  // never drift apart.
  private async resolveExclusions(userId: string): Promise<{
    exclusions: ExclusionTargets;
    roleIdByName: Map<string, string>;
  }> {
    const [foodPreferenceExclusions, taxonomyIds] = await Promise.all([
      this.foodPreferencesService.getExclusionTargets(userId),
      this.getTaxonomyIdMaps(),
    ]);
    const exclusions = await this.withDietPreferenceExclusions(
      userId,
      foodPreferenceExclusions,
      taxonomyIds.categoryIdByName,
      taxonomyIds.roleIdByName,
    );
    return { exclusions, roleIdByName: taxonomyIds.roleIdByName };
  }

  // Favorites only ever narrow generate()'s own candidate pool (ADR-014)
  // - swapItem() deliberately doesn't call this, a swap picker should
  // still offer every eligible same-Role item, not just favorites.
  private async findGenerationCandidatesByRole(
    userId: string,
    exclusions: ExclusionTargets,
    roleIdByName: Map<string, string>,
  ): Promise<Map<string, FoodCandidate[]>> {
    const [candidatesByRole, favoriteFoodItemIds] = await Promise.all([
      this.findCandidatesByRole(exclusions, roleIdByName),
      this.foodPreferencesService.getFavoriteFoodItemIds(userId),
    ]);
    return restrictToFavorites(candidatesByRole, favoriteFoodItemIds);
  }

  private async getAlgorithm() {
    const algorithm = await this.db.query.dietCalculationAlgorithms.findFirst({
      where: eq(schema.dietCalculationAlgorithms.code, ALGORITHM_CODE),
    });
    if (!algorithm) {
      // Seeded by a migration - only reachable if migrations haven't fully run.
      throw new NotFoundException('Calorie algorithm not configured');
    }
    return algorithm;
  }

  async generate(userId: string): Promise<DietResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Profile not created yet');
    }

    const target = await this.calorieTargetsService.computeForUser(userId);
    const algorithm = await this.getAlgorithm();

    const { exclusions, roleIdByName } = await this.resolveExclusions(userId);
    const candidatesByRole = await this.findGenerationCandidatesByRole(
      userId,
      exclusions,
      roleIdByName,
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
            algorithmCode: ALGORITHM_CODE,
            targetCalories: target.calories,
            targetProteinG: target.proteinG,
            targetCarbsG: target.carbsG,
            targetFatG: target.fatG,
            mealCount: user.mealCount,
          },
        })
        .returning();

      if (generated.items.length > 0) {
        await tx.insert(schema.dietItems).values(
          generated.items.map((item) => ({
            dietId: inserted.id,
            foodItemId: item.foodItemId,
            mealType: item.mealType,
            mealOccurrence: item.mealOccurrence,
            weightGrams: item.weightGrams.toString(),
            orderIndex: item.orderIndex,
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

    const algorithm = await this.db.query.dietCalculationAlgorithms.findFirst({
      where: eq(schema.dietCalculationAlgorithms.id, dietRow.algorithmId),
    });
    if (!algorithm) {
      throw new NotFoundException('Calorie algorithm not configured');
    }

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
    // gramsForCalories divides by this - a 0-calorie item can't be portioned.
    if (Number(replacement.caloriesPer100g) <= 0) {
      throw new UnprocessableEntityException(
        'That food item has no calories and cannot be portioned into a menu',
      );
    }
    if (isPreferenceExcluded(replacement, exclusions)) {
      throw new UnprocessableEntityException(
        'This replacement violates an active food preference',
      );
    }
    return replacement;
  }

  private async pickRerollReplacement(
    currentFoodItem: FoodItemRow,
    exclusions: ExclusionTargets,
    pickRandom: <T>(items: T[]) => T,
  ): Promise<FoodItemRow> {
    const sameRoleRows = await this.db.query.foodCalories.findMany({
      where: and(
        eq(schema.foodCalories.roleId, currentFoodItem.roleId),
        eq(schema.foodCalories.isVerified, true),
      ),
    });
    const candidates = eligibleReplacements(
      // 0-calorie items can't be portion-scaled - same exclusion generate makes.
      sameRoleRows.filter((row) => Number(row.caloriesPer100g) > 0),
      currentFoodItem.id,
      exclusions,
    );
    if (candidates.length === 0) {
      throw new UnprocessableEntityException(
        'No other food item in this role matches your preferences',
      );
    }
    return pickRandom(candidates);
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

      // Re-derives totals from every item rather than adjusting by the
      // swapped item's delta, so they can never drift from what the items sum to.
      const itemRows = await tx
        .select({
          weightGrams: schema.dietItems.weightGrams,
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
        .where(eq(schema.dietItems.dietId, diet.id));

      const totals = itemRows.reduce(
        (acc, row) => {
          const factor = Number(row.weightGrams) / 100;
          return {
            calories: acc.calories + Number(row.caloriesPer100g) * factor,
            protein: acc.protein + Number(row.proteinPer100g) * factor,
            carbs: acc.carbs + Number(row.carbsPer100g) * factor,
            fat: acc.fat + Number(row.fatPer100g) * factor,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      const [updated] = await tx
        .update(schema.diets)
        .set({
          totalCalories: Math.round(totals.calories).toString(),
          totalProtein: Math.round(totals.protein).toString(),
          totalCarbs: Math.round(totals.carbs).toString(),
          totalFat: Math.round(totals.fat).toString(),
        })
        .where(eq(schema.diets.id, diet.id))
        .returning();

      return updated;
    });

    const algorithm = await this.db.query.dietCalculationAlgorithms.findFirst({
      where: eq(schema.dietCalculationAlgorithms.id, updatedDiet.algorithmId),
    });
    if (!algorithm) {
      throw new NotFoundException('Calorie algorithm not configured');
    }

    return this.buildResponse(updatedDiet, algorithm);
  }

  private async buildResponse(
    dietRow: typeof schema.diets.$inferSelect,
    algorithm: typeof schema.dietCalculationAlgorithms.$inferSelect,
  ): Promise<DietResponse> {
    const itemRows: DietItemWithFoodRow[] = await this.db
      .select({
        id: schema.dietItems.id,
        mealType: schema.dietItems.mealType,
        mealOccurrence: schema.dietItems.mealOccurrence,
        orderIndex: schema.dietItems.orderIndex,
        weightGrams: schema.dietItems.weightGrams,
        foodItemId: schema.foodCalories.id,
        foodItemName: schema.foodCalories.name,
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
      .where(eq(schema.dietItems.dietId, dietRow.id))
      .orderBy(
        schema.dietItems.mealType,
        schema.dietItems.mealOccurrence,
        schema.dietItems.orderIndex,
      );

    return toDietResponse(dietRow, algorithm, itemRows);
  }
}
