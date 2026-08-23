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
import { DailyLogsService } from '../daily-logs/daily-logs.service';
import { DietPreferencesService } from '../diet-preferences/diet-preferences.service';
import type { DietType } from '../diet-preferences/diet-preference.types';
import { FoodPreferencesService } from '../food-preferences/food-preferences.service';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';
import { UsersService } from '../users/users.service';
import {
  categoryNamesExcludedBy,
  roleNamesExcludedBy,
} from './diet-preference-exclusions';
import {
  toDietResponse,
  type DietItemWithFoodRow,
  type DietResponse,
} from './diet.mapper';
import { MEAL_ROLE_CHAINS, type FoodCandidate } from './diet.types';
import { generateDietItems } from './greedy-heuristic';

// Same registered code calorie-targets.service.ts looks up, so the two
// services' targets can never drift apart.
const ALGORITHM_CODE = 'mifflin_v1';

@Injectable()
export class DietsService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly usersService: UsersService,
    private readonly dailyLogsService: DailyLogsService,
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

  // `date` selects which Daily Log the new Diet attaches to; the
  // calorie/macro target itself always comes from the user's most recent
  // weigh-in regardless of that date.
  async generate(userId: string, date: string): Promise<DietResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Profile not created yet');
    }

    const target = await this.calorieTargetsService.computeForUser(userId);
    const algorithm = await this.getAlgorithm();
    const dailyLog = await this.dailyLogsService.findOrCreate(userId, date);

    const { exclusions, roleIdByName } = await this.resolveExclusions(userId);
    const candidatesByRole = await this.findCandidatesByRole(
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
      mealCount: user.mealCount,
      candidatesByRole,
    });

    const dietRow = await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.diets)
        .values({
          dailyLogId: dailyLog.id,
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
            weightGrams: item.weightGrams.toString(),
            orderIndex: item.orderIndex,
          })),
        );
      }

      return inserted;
    });

    return this.buildResponse(dietRow, algorithm);
  }

  // Most recently created Diet row for the Daily Log, not a stored
  // is_current flag; older Diets are kept as history.
  async findCurrent(userId: string, date: string): Promise<DietResponse> {
    const dailyLog = await this.dailyLogsService.findByDate(userId, date);
    if (!dailyLog) {
      throw new NotFoundException('No Daily Log for this date');
    }

    const dietRow = await this.db.query.diets.findFirst({
      where: eq(schema.diets.dailyLogId, dailyLog.id),
      orderBy: desc(schema.diets.createdAt),
    });
    if (!dietRow) {
      throw new NotFoundException('No Diet generated for this date yet');
    }

    const algorithm = await this.db.query.dietCalculationAlgorithms.findFirst({
      where: eq(schema.dietCalculationAlgorithms.id, dietRow.algorithmId),
    });
    if (!algorithm) {
      throw new NotFoundException('Calorie algorithm not configured');
    }

    return this.buildResponse(dietRow, algorithm);
  }

  // diets carries no userId column - ownership is only verifiable by
  // joining through its Daily Log.
  private async findOwnedDiet(
    userId: string,
    dietId: string,
  ): Promise<typeof schema.diets.$inferSelect> {
    const [row] = await this.db
      .select({ diet: schema.diets })
      .from(schema.diets)
      .innerJoin(
        schema.dailyLogs,
        eq(schema.dailyLogs.id, schema.diets.dailyLogId),
      )
      .where(
        and(eq(schema.diets.id, dietId), eq(schema.dailyLogs.userId, userId)),
      );
    if (!row) {
      throw new NotFoundException('Diet not found');
    }
    return row.diet;
  }

  async swapItem(
    userId: string,
    dietId: string,
    itemId: string,
    foodItemId: string,
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

    const [currentFoodItem, replacementFoodItem] = await Promise.all([
      this.db.query.foodCalories.findFirst({
        where: eq(schema.foodCalories.id, dietItem.foodItemId),
      }),
      this.db.query.foodCalories.findFirst({
        where: eq(schema.foodCalories.id, foodItemId),
      }),
    ]);
    if (!replacementFoodItem) {
      throw new NotFoundException('Food item not found');
    }
    // Unreachable in practice - dietItem.foodItemId is a not-null FK.
    if (!currentFoodItem) {
      throw new NotFoundException('Original food item not found');
    }

    if (replacementFoodItem.roleId !== currentFoodItem.roleId) {
      throw new BadRequestException(
        'Replacement must share the same Food Role as the item being swapped',
      );
    }

    const { exclusions } = await this.resolveExclusions(userId);
    const violatesPreference =
      exclusions.food_item.has(replacementFoodItem.id) ||
      exclusions.category.has(replacementFoodItem.categoryId) ||
      exclusions.subcategory.has(replacementFoodItem.subcategoryId) ||
      exclusions.role.has(replacementFoodItem.roleId);
    if (violatesPreference) {
      throw new UnprocessableEntityException(
        'This replacement violates an active food preference',
      );
    }

    const updatedDiet = await this.db.transaction(async (tx) => {
      await tx
        .update(schema.dietItems)
        .set({ foodItemId: replacementFoodItem.id })
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
        orderIndex: schema.dietItems.orderIndex,
        weightGrams: schema.dietItems.weightGrams,
        foodItemId: schema.foodCalories.id,
        foodItemName: schema.foodCalories.name,
        foodItemImageUrl: schema.foodCalories.imageUrl,
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
      .where(eq(schema.dietItems.dietId, dietRow.id))
      .orderBy(schema.dietItems.mealType, schema.dietItems.orderIndex);

    return toDietResponse(dietRow, algorithm, itemRows);
  }
}
