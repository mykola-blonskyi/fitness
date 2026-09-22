import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from './schema';

// Reading a table another module owns is how a rule ends up with two
// implementations that drift - see ADR-027. A join is fine: it reads a
// foreign table to shape the module's own rows. A query rooted at one
// (from/insert/update/delete/db.query) claims ownership, so it belongs to
// the owning module's service.
const OWNER_BY_TABLE: Record<string, string> = {
  users: 'users',
  dailyLogs: 'daily-logs',
  exercises: 'exercises',
  exerciseTranslations: 'exercises',
  trainingPrograms: 'training-programs',
  userActivePrograms: 'training-programs',
  programExercises: 'training-programs',
  workoutLogs: 'workout-logs',
  workoutSets: 'workout-logs',
  foodCategories: 'food-items',
  foodSubcategories: 'food-items',
  foodRoles: 'food-items',
  foodFamilies: 'food-items',
  foodCalories: 'food-items',
  foodCalorieTranslations: 'food-items',
  foodPreferences: 'food-preferences',
  dietPreferences: 'diet-preferences',
  dietCalculationAlgorithms: 'calorie-targets',
  diets: 'diets',
  dietItems: 'diets',
  dietMealOrder: 'diets',
  photoSessions: 'photo-sessions',
  progressPhotos: 'photo-sessions',
};

// admin is a back office over every table and scripts are one-off jobs;
// routing either through eleven services would buy nothing.
const UNSCOPED_MODULES = new Set(['admin', 'scripts', 'db']);

const EXCEPTIONS: { file: string; table: string; why: string }[] = [
  {
    file: 'shared/locale.ts',
    table: 'users',
    why: 'One helper taking db as a parameter, already the single source of the locale lookup',
  },
];

// Emptied over the rest of this branch, one migration per commit.
const PENDING_MIGRATIONS = [
  'daily-logs/daily-logs.service.ts queries users (users)',
  'diets/diets.service.ts queries dietCalculationAlgorithms (calorie-targets)',
  'diets/diets.service.ts queries foodCalories (food-items)',
  'diets/diets.service.ts queries foodCategories (food-items)',
  'diets/diets.service.ts queries foodRoles (food-items)',
  'food-preferences/food-preferences.service.ts queries dietPreferences (diet-preferences)',
  'food-preferences/food-preferences.service.ts queries foodCalories (food-items)',
  'food-preferences/food-preferences.service.ts queries foodCategories (food-items)',
  'food-preferences/food-preferences.service.ts queries foodRoles (food-items)',
  'food-preferences/food-preferences.service.ts queries foodSubcategories (food-items)',
  'training-programs/training-programs.service.ts queries exercises (exercises)',
  'workout-logs/workout-logs.service.ts queries exercises (exercises)',
];

const ROOTING_CALL = /\.(?:from|insert|update|delete)\(\s*schema\.(\w+)/g;
const RELATIONAL_QUERY = /\.query\.(\w+)\./g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return entry.endsWith('.ts') && !entry.endsWith('.spec.ts') ? [path] : [];
  });
}

function rootedTables(source: string): string[] {
  return [
    ...source.matchAll(ROOTING_CALL),
    ...source.matchAll(RELATIONAL_QUERY),
  ]
    .map((match) => match[1])
    .filter((table) => table in OWNER_BY_TABLE);
}

describe('table ownership', () => {
  const srcDir = join(__dirname, '..');

  it('covers every table in the schema', () => {
    const tables = Object.entries(schema)
      .filter(([, value]) => is(value, PgTable))
      .map(([name]) => name);
    expect(Object.keys(OWNER_BY_TABLE).sort()).toEqual(tables.sort());
  });

  it('roots each table query in the module that owns it', () => {
    const violations: string[] = [];

    for (const path of sourceFiles(srcDir)) {
      const file = relative(srcDir, path);
      const module = file.split('/')[0];
      if (UNSCOPED_MODULES.has(module)) continue;

      for (const table of rootedTables(readFileSync(path, 'utf8'))) {
        const owner = OWNER_BY_TABLE[table];
        if (owner === module) continue;
        const excused = EXCEPTIONS.some(
          (exception) => exception.file === file && exception.table === table,
        );
        if (!excused) violations.push(`${file} queries ${table} (${owner})`);
      }
    }

    expect([...new Set(violations)].sort()).toEqual(PENDING_MIGRATIONS);
  });
});
