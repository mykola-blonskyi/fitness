import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CalorieTargetsService,
  type CalorieAlgorithmRow,
} from '../calorie-targets/calorie-targets.service';
import { DietPreferencesService } from '../diet-preferences/diet-preferences.service';
import type { DietType } from '../diet-preferences/diet-preference.types';
import type { ListFoodItemsDto } from '../food-items/dto/list-food-items.dto';
import {
  generationIneligibility,
  resolveSlotConstraint,
  satisfiesSlot,
  type SlotConstraint,
  type TaxonomyIds,
} from '../food-items/food-eligibility';
import {
  FoodItemsService,
  type FoodItemPage,
} from '../food-items/food-items.service';
import type { FoodItemRow } from '../food-items/food-item.types';
import { FoodPreferencesService } from '../food-preferences/food-preferences.service';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';
import { UsersService } from '../users/users.service';
import {
  categoryNamesExcludedBy,
  proteinCategoriesFor,
  roleNamesExcludedBy,
} from './diet-preference-exclusions';
import { toDietResponse, type DietResponse } from './diet.mapper';
import {
  DietsRepository,
  type DietItemRow,
  type DietRow,
} from './diets.repository';
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

@Injectable()
export class DietsService {
  constructor(
    private readonly dietsRepository: DietsRepository,
    private readonly usersService: UsersService,
    private readonly calorieTargetsService: CalorieTargetsService,
    private readonly foodPreferencesService: FoodPreferencesService,
    private readonly dietPreferencesService: DietPreferencesService,
    private readonly foodItemsService: FoodItemsService,
  ) {}

  private async withDietPreferenceExclusions(
    userId: string,
    base: ExclusionTargets,
    categoryIdByName: ReadonlyMap<string, string>,
    roleIdByName: ReadonlyMap<string, string>,
  ): Promise<{ merged: ExclusionTargets; dietTypes: DietType[] }> {
    const dietTypes = await this.dietPreferencesService.listTypes(userId);

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

  // A whole-role exclusion drops that role before the query rather than
  // filtering after it. roleIdByName is a bijection (food_roles.name is
  // unique), so each returned role id maps back to exactly one role name.
  private async findCandidatesByRole(
    exclusions: ExclusionTargets,
    roleIdByName: ReadonlyMap<string, string>,
    favoriteFoodItemIds: ReadonlySet<string>,
  ): Promise<Map<string, FoodCandidate[]>> {
    const candidatesByRole = new Map<string, FoodCandidate[]>();
    const roleNameById = new Map<string, string>();
    for (const roleName of new Set(MEAL_ROLE_CHAINS.flat())) {
      candidatesByRole.set(roleName, []);
      const roleId = roleIdByName.get(roleName);
      if (roleId && !exclusions.role.has(roleId)) {
        roleNameById.set(roleId, roleName);
      }
    }

    const rows = await this.foodItemsService.findGenerationCandidates(
      [...roleNameById.keys()],
      favoriteFoodItemIds,
      exclusions,
    );

    for (const { roleId, ...candidate } of rows) {
      // Excludes 0-calorie items (e.g. water) - greedy-heuristic.ts
      // divides by this value when portion-scaling.
      if (candidate.caloriesPer100g <= 0) continue;
      const roleName = roleNameById.get(roleId);
      if (roleName) candidatesByRole.get(roleName)!.push(candidate);
    }

    return candidatesByRole;
  }

  // Shared by generation, the swap picker and swapItem()'s own check, so
  // "excluded during generation" and "rejected on swap" cannot drift apart.
  private async resolveExclusions(userId: string): Promise<{
    exclusions: ExclusionTargets;
    taxonomy: TaxonomyIds;
    dietTypes: DietType[];
  }> {
    const [foodPreferenceExclusions, taxonomyIds] = await Promise.all([
      this.foodPreferencesService.getExclusionTargets(userId),
      this.foodItemsService.getTaxonomyIds(),
    ]);
    const { merged: exclusions, dietTypes } =
      await this.withDietPreferenceExclusions(
        userId,
        foodPreferenceExclusions,
        taxonomyIds.categoryIdByName,
        taxonomyIds.roleIdByName,
      );
    return { exclusions, taxonomy: taxonomyIds, dietTypes };
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

    const [{ exclusions, taxonomy, dietTypes }, favoriteFoodItemIds] =
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
      taxonomy.roleIdByName,
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

    const dietRow = await this.dietsRepository.insertGenerated({
      userId,
      algorithmId: algorithm.id,
      totalCalories: generated.totalCalories,
      totalProtein: generated.totalProtein,
      totalCarbs: generated.totalCarbs,
      totalFat: generated.totalFat,
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
      items: generated.items,
    });

    return this.buildResponse(dietRow, algorithm);
  }

  async findCurrent(userId: string): Promise<DietResponse> {
    const dietRow = await this.dietsRepository.findLatestForUser(userId);
    if (!dietRow) {
      throw new NotFoundException('No Diet generated yet');
    }

    const algorithm = await this.calorieTargetsService.getAlgorithmById(
      dietRow.algorithmId,
    );
    return this.buildResponse(dietRow, algorithm);
  }

  private async findOwnedDiet(
    userId: string,
    dietId: string,
  ): Promise<DietRow> {
    const diet = await this.dietsRepository.findOwned(userId, dietId);
    if (!diet) {
      throw new NotFoundException('Diet not found');
    }
    return diet;
  }

  private async resolveExplicitReplacement(
    foodItemId: string,
    slot: SlotConstraint,
    exclusions: ExclusionTargets,
    favoriteFoodItemIds: ReadonlySet<string>,
  ): Promise<FoodItemRow> {
    const replacement = await this.foodItemsService.findRow(foodItemId);
    if (!replacement) {
      throw new NotFoundException('Food item not found');
    }
    if (!satisfiesSlot(replacement, slot)) {
      throw new BadRequestException(
        'Replacement must fill the same macro slot as the item being swapped',
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
    slot: SlotConstraint,
    exclusions: ExclusionTargets,
    pickRandom: <T>(items: T[]) => T,
  ): Promise<FoodItemRow> {
    const sameSlotRows = await this.foodItemsService.findSlotCandidates(
      slot,
      exclusions,
      currentFoodItem.id,
    );
    // 0-calorie items can't be portion-scaled - same exclusion generate makes.
    const candidates = sameSlotRows.filter(
      (row) => Number(row.caloriesPer100g) > 0,
    );
    if (candidates.length === 0) {
      throw new UnprocessableEntityException(
        'No other food item fits this slot and your preferences',
      );
    }

    return pickRandom(candidates);
  }

  // Narrowed to what swapItem() will actually accept, so the picker cannot
  // offer an item that then 422s - both resolve the same SlotConstraint.
  async listSwapCandidates(
    userId: string,
    params: ListFoodItemsDto,
  ): Promise<FoodItemPage> {
    // The slot subsumes the role, so forwarding both would narrow straight
    // back to the single Role this replaces.
    const { role, ...rest } = params;
    if (!role) {
      throw new BadRequestException('role is required');
    }
    const [{ exclusions, taxonomy, dietTypes }, favoriteFoodItemIds] =
      await Promise.all([
        this.resolveExclusions(userId),
        this.foodPreferencesService.getFavoriteFoodItemIds(userId),
      ]);
    const roleId = taxonomy.roleIdByName.get(role);
    if (!roleId) {
      throw new BadRequestException('Unknown Food Role');
    }
    return this.foodItemsService.list(userId, rest, {
      exclusions,
      favoriteFoodItemIds,
      slot: resolveSlotConstraint(roleId, taxonomy, dietTypes),
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

    const currentFoodItem = await this.foodItemsService.findRow(
      dietItem.foodItemId,
    );
    // Unreachable in practice - dietItem.foodItemId is a not-null FK.
    if (!currentFoodItem) {
      throw new NotFoundException('Original food item not found');
    }

    const { exclusions, taxonomy, dietTypes } =
      await this.resolveExclusions(userId);
    const slot = resolveSlotConstraint(
      currentFoodItem.roleId,
      taxonomy,
      dietTypes,
    );

    const replacement = foodItemId
      ? await this.resolveExplicitReplacement(
          foodItemId,
          slot,
          exclusions,
          await this.foodPreferencesService.getFavoriteFoodItemIds(userId),
        )
      : await this.pickRerollReplacement(
          currentFoodItem,
          slot,
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

    const updatedDiet = await this.dietsRepository.swapItemFood(
      diet.id,
      dietItem.id,
      replacement.id,
      newGrams,
    );

    const algorithm = await this.calorieTargetsService.getAlgorithmById(
      updatedDiet.algorithmId,
    );
    return this.buildResponse(updatedDiet, algorithm);
  }

  private async findOwnedDietItem(
    userId: string,
    dietId: string,
    itemId: string,
  ): Promise<{
    diet: DietRow;
    dietItem: DietItemRow;
  }> {
    const diet = await this.findOwnedDiet(userId, dietId);
    const dietItem = await this.dietsRepository.findItem(diet.id, itemId);
    if (!dietItem) {
      throw new NotFoundException('Diet item not found');
    }
    return { diet, dietItem };
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

    const updatedDiet = await this.dietsRepository.deleteItem(
      diet.id,
      dietItem.id,
    );

    const algorithm = await this.calorieTargetsService.getAlgorithmById(
      updatedDiet.algorithmId,
    );
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

    const existingPositions = new Set(
      await this.dietsRepository.listMealPositions(diet.id),
    );

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

    await this.dietsRepository.replaceMealOrder(
      diet.id,
      dto.orderedMealPositions,
    );

    const algorithm = await this.calorieTargetsService.getAlgorithmById(
      diet.algorithmId,
    );
    return this.buildResponse(diet, algorithm);
  }

  private async buildResponse(
    dietRow: DietRow,
    // Pick, not the full row type - generate() passes the algorithm
    // subset CalorieTargetResponse carries (see computeForUser), which
    // has no createdAt.
    algorithm: Pick<CalorieAlgorithmRow, 'code' | 'name'>,
  ): Promise<DietResponse> {
    const locale = await this.dietsRepository.resolveLocale(dietRow.userId);
    const itemRows = await this.dietsRepository.listItemsWithFood(
      dietRow.id,
      locale,
    );
    const orderRows = await this.dietsRepository.listMealOrder(dietRow.id);

    const mealPositions = [...new Set(itemRows.map((row) => row.mealPosition))];
    const mealOrder = resolveMealOrder(mealPositions, orderRows);

    return toDietResponse(dietRow, algorithm, itemRows, mealOrder);
  }
}
