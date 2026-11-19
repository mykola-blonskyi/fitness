import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import {
  DEMO_EMAIL,
  DEMO_IDENTITY_SUB,
  DEMO_USER_ID,
} from '../identity/demo-identity';
import { CURATED_SOURCE } from './food-staples';

type Db = NodePgDatabase<typeof schema>;

const PROGRAM_TITLE = 'Full body';

// wger ids, so the same rows are found in every environment's catalog.
const PROGRAM = [
  { sourceId: '615', reps: 8, startKg: 60 }, // Squats
  { sourceId: '73', reps: 8, startKg: 50 }, // Bench Press
  { sourceId: '1698', reps: 10, startKg: 45 }, // Barbell Row (Overhand)
  { sourceId: '566', reps: 10, startKg: 30 }, // Shoulder Press, Barbell
  { sourceId: '984', reps: 12, startKg: 16 }, // Lunges
];

const FAVORITES = [
  'chicken-breast-raw',
  'turkey-breast-raw',
  'salmon-fillet-raw',
  'chicken-egg-whole-raw',
  'cottage-cheese-5',
  'greek-yogurt-2',
  'rolled-oats-dry',
  'buckwheat-groats-dry',
  'brown-rice-dry',
  'potato-raw',
  'wholemeal-wheat-bread',
  'olive-oil-extra-virgin',
  'almonds',
  'avocado-raw',
  'broccoli-raw',
  'tomato-raw',
  'cucumber-raw',
  'banana-raw',
  'apple-raw',
  'blueberry-raw',
];

const HISTORY_DAYS = 42;
const WORKOUT_DAYS = 21;

function isoDaysAgo(today: Date, days: number): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// The users row keeps its id, so open demo sessions survive a reset. The
// caller generates the diet afterwards, through the real generator.
export async function resetDemoData(db: Db, today = new Date()) {
  await db.transaction(async (tx) => {
    // Children go through ON DELETE CASCADE.
    for (const table of [
      schema.diets,
      schema.dailyLogs,
      schema.trainingPrograms,
      schema.foodPreferences,
      schema.dietPreferences,
    ]) {
      await tx.delete(table).where(eq(table.userId, DEMO_USER_ID));
    }

    const profile = {
      identitySub: DEMO_IDENTITY_SUB,
      email: DEMO_EMAIL,
      name: 'Demo',
      dateOfBirth: '1993-04-12',
      height: '178',
      gender: 'male' as const,
      goal: 'weight_loss' as const,
      activityLevel: 'moderate' as const,
      avatarUrl: null,
      isAdmin: false,
      mealCount: 4,
      locale: 'en',
      defaultWeightUnit: 'kg' as const,
      healthDataConsentAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date(),
    };
    await tx
      .insert(schema.users)
      .values({ id: DEMO_USER_ID, ...profile })
      .onConflictDoUpdate({ target: schema.users.id, set: profile });

    const dailyLogs = await tx
      .insert(schema.dailyLogs)
      .values(
        Array.from({ length: HISTORY_DAYS }, (_, daysAgo) => ({
          userId: DEMO_USER_ID,
          date: isoDaysAgo(today, daysAgo),
          // About 3 kg lost over six weeks, with daily noise.
          weight: (81 + daysAgo * 0.07 + Math.sin(daysAgo * 1.7) * 0.4).toFixed(
            1,
          ),
          weightUnit: 'kg' as const,
        })),
      )
      .returning({ id: schema.dailyLogs.id, date: schema.dailyLogs.date });

    const exercises = await tx
      .select({ id: schema.exercises.id, sourceId: schema.exercises.sourceId })
      .from(schema.exercises)
      .where(
        and(
          eq(schema.exercises.source, 'wger'),
          inArray(
            schema.exercises.sourceId,
            PROGRAM.map((p) => p.sourceId),
          ),
        ),
      );
    const exerciseId = new Map(exercises.map((e) => [e.sourceId, e.id]));
    const program = PROGRAM.filter((p) => exerciseId.has(p.sourceId));
    if (program.length === 0) {
      throw new Error(
        'Demo seed: none of the program exercises are in the catalog',
      );
    }

    const [trainingProgram] = await tx
      .insert(schema.trainingPrograms)
      .values({ userId: DEMO_USER_ID, title: PROGRAM_TITLE })
      .returning({ id: schema.trainingPrograms.id });
    await tx.insert(schema.userActivePrograms).values({
      userId: DEMO_USER_ID,
      trainingProgramId: trainingProgram.id,
    });
    await tx.insert(schema.programExercises).values(
      program.map((p, orderIndex) => ({
        trainingProgramId: trainingProgram.id,
        exerciseId: exerciseId.get(p.sourceId)!,
        orderIndex,
        targetSets: 3,
        targetReps: p.reps,
      })),
    );

    for (let daysAgo = WORKOUT_DAYS; daysAgo >= 1; daysAgo--) {
      if (daysAgo % 7 !== 1 && daysAgo % 7 !== 3 && daysAgo % 7 !== 5) continue;
      const date = isoDaysAgo(today, daysAgo);
      const dailyLog = dailyLogs.find((log) => log.date === date)!;
      const week = Math.floor((WORKOUT_DAYS - daysAgo) / 7);
      const [workoutLog] = await tx
        .insert(schema.workoutLogs)
        .values({
          dailyLogId: dailyLog.id,
          trainingProgramId: trainingProgram.id,
          title: PROGRAM_TITLE,
        })
        .returning({ id: schema.workoutLogs.id });
      await tx.insert(schema.workoutSets).values(
        program.flatMap((p) =>
          [1, 2, 3].map((setNumber) => ({
            workoutLogId: workoutLog.id,
            exerciseId: exerciseId.get(p.sourceId)!,
            setNumber,
            weight: String(p.startKg + week * 2.5),
            weightUnit: 'kg' as const,
            reps: p.reps,
          })),
        ),
      );
    }

    const favorites = await tx
      .select({ id: schema.foodCalories.id })
      .from(schema.foodCalories)
      .where(
        and(
          eq(schema.foodCalories.source, CURATED_SOURCE),
          inArray(schema.foodCalories.sourceId, FAVORITES),
        ),
      );
    if (favorites.length > 0) {
      await tx.insert(schema.foodPreferences).values(
        favorites.map((f) => ({
          userId: DEMO_USER_ID,
          type: 'favorite' as const,
          targetType: 'food_item' as const,
          targetId: f.id,
        })),
      );
    }
  });
}
