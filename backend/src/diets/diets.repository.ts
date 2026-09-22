import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { resolveUserLocale } from '../shared/locale';
import { sumCountedTotals } from './diet-totals';
import type { DietItemWithFoodRow } from './diet.mapper';
import type { GeneratedDietItem } from './diet.types';

export type DietRow = typeof schema.diets.$inferSelect;
export type DietItemRow = typeof schema.dietItems.$inferSelect;
export type DietCalculationMetadata =
  (typeof schema.diets.$inferInsert)['calculationMetadata'];

type Tx = Parameters<
  Parameters<NodePgDatabase<typeof schema>['transaction']>[0]
>[0];

interface InsertGeneratedDietInput {
  userId: string;
  algorithmId: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  calculationMetadata: DietCalculationMetadata;
  items: GeneratedDietItem[];
}

@Injectable()
export class DietsRepository {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async insertGenerated(input: InsertGeneratedDietInput): Promise<DietRow> {
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.diets)
        .values({
          userId: input.userId,
          algorithmId: input.algorithmId,
          totalCalories: input.totalCalories.toString(),
          totalProtein: input.totalProtein.toString(),
          totalCarbs: input.totalCarbs.toString(),
          totalFat: input.totalFat.toString(),
          calculationMetadata: input.calculationMetadata,
        })
        .returning();

      if (input.items.length > 0) {
        await tx.insert(schema.dietItems).values(
          input.items.map((item) => ({
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
  }

  // Most recently created Diet row for the user, not a stored is_current
  // flag; older Diets are kept as history.
  async findLatestForUser(userId: string): Promise<DietRow | undefined> {
    return this.db.query.diets.findFirst({
      where: eq(schema.diets.userId, userId),
      orderBy: desc(schema.diets.createdAt),
    });
  }

  async findOwned(
    userId: string,
    dietId: string,
  ): Promise<DietRow | undefined> {
    return this.db.query.diets.findFirst({
      where: and(eq(schema.diets.id, dietId), eq(schema.diets.userId, userId)),
    });
  }

  async findItem(
    dietId: string,
    itemId: string,
  ): Promise<DietItemRow | undefined> {
    return this.db.query.dietItems.findFirst({
      where: and(
        eq(schema.dietItems.id, itemId),
        eq(schema.dietItems.dietId, dietId),
      ),
    });
  }

  async swapItemFood(
    dietId: string,
    dietItemId: string,
    foodItemId: string,
    weightGrams: number,
  ): Promise<DietRow> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(schema.dietItems)
        .set({ foodItemId, weightGrams: weightGrams.toString() })
        .where(eq(schema.dietItems.id, dietItemId));

      return this.recalculateTotals(tx, dietId);
    });
  }

  async deleteItem(dietId: string, dietItemId: string): Promise<DietRow> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(schema.dietItems)
        .where(eq(schema.dietItems.id, dietItemId));
      return this.recalculateTotals(tx, dietId);
    });
  }

  async listMealPositions(dietId: string): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ mealPosition: schema.dietItems.mealPosition })
      .from(schema.dietItems)
      .where(eq(schema.dietItems.dietId, dietId));
    return rows.map((row) => row.mealPosition);
  }

  async replaceMealOrder(
    dietId: string,
    orderedMealPositions: number[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.dietMealOrder)
        .where(eq(schema.dietMealOrder.dietId, dietId));
      await tx.insert(schema.dietMealOrder).values(
        orderedMealPositions.map((mealPosition, index) => ({
          dietId,
          mealPosition,
          displayOrder: index,
        })),
      );
    });
  }

  async listItemsWithFood(
    dietId: string,
    locale: string,
  ): Promise<DietItemWithFoodRow[]> {
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
      .where(eq(schema.dietItems.dietId, dietId))
      .orderBy(schema.dietItems.mealPosition, schema.dietItems.orderIndex);

    return rows.map(({ translatedName, ...row }) => ({
      ...row,
      foodItemName: translatedName ?? row.foodItemName,
    }));
  }

  async listMealOrder(
    dietId: string,
  ): Promise<{ mealPosition: number; displayOrder: number }[]> {
    return this.db
      .select({
        mealPosition: schema.dietMealOrder.mealPosition,
        displayOrder: schema.dietMealOrder.displayOrder,
      })
      .from(schema.dietMealOrder)
      .where(eq(schema.dietMealOrder.dietId, dietId));
  }

  // Here rather than in the service because this is the only class in the
  // module still holding a db handle.
  async resolveLocale(userId: string): Promise<string> {
    return resolveUserLocale(this.db, userId);
  }

  // Re-derives totals from every remaining item rather than adjusting by the
  // edited item's delta, so they can never drift from what the items sum to.
  private async recalculateTotals(tx: Tx, dietId: string): Promise<DietRow> {
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
}
