import { SettingsNav } from '@features/settings';
import {
  AddDietPreferenceForm,
  AddFoodPreferenceForm,
} from '@features/preferences';
import {
  removeDietPreference,
  removeFoodPreference,
} from '@features/preferences/actions';
import type { FoodItem, FoodTaxonomy } from '@features/food-catalog/actions';
import { apiFetch } from '@libs/api-client';
import {
  DIET_TYPE_LABELS,
  type DietPreference,
  type FoodPreference,
} from '@shared/types/preferences';

const TYPE_LABELS: Record<FoodPreference['type'], string> = {
  allergy: 'Allergy',
  exclude: 'Exclude',
};

export default async function PreferencesSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [foodPreferences, dietPreferences, taxonomy, foodItems] =
    await Promise.all([
      apiFetch<FoodPreference[]>('/food-preferences'),
      apiFetch<DietPreference[]>('/diet-preferences'),
      apiFetch<FoodTaxonomy>('/food-items/taxonomy'),
      apiFetch<FoodItem[]>('/food-items'),
    ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-16">
      <SettingsNav locale={locale} active="preferences" />
      <h1 className="text-2xl font-semibold">Preferences</h1>

      <section className="flex w-full max-w-sm flex-col gap-3">
        <h2 className="text-lg font-semibold">Diet type</h2>
        <ul className="flex flex-col gap-2">
          {dietPreferences.map((preference) => (
            <li
              key={preference.id}
              className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-sm">
                {DIET_TYPE_LABELS[preference.dietType]}
              </span>
              <form action={removeDietPreference.bind(null, preference.id)}>
                <button
                  type="submit"
                  className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
          {dietPreferences.length === 0 && (
            <p className="text-sm text-zinc-500">No diet type declared.</p>
          )}
        </ul>
        <AddDietPreferenceForm
          alreadySelected={dietPreferences.map((p) => p.dietType)}
        />
      </section>

      <section className="flex w-full max-w-sm flex-col gap-3">
        <h2 className="text-lg font-semibold">Allergies &amp; exclusions</h2>
        <ul className="flex flex-col gap-2">
          {foodPreferences.map((preference) => (
            <li
              key={preference.id}
              className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-sm">
                {TYPE_LABELS[preference.type]} &middot;{' '}
                {preference.targetName ?? 'Unknown'}
              </span>
              <form action={removeFoodPreference.bind(null, preference.id)}>
                <button
                  type="submit"
                  className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
          {foodPreferences.length === 0 && (
            <p className="text-sm text-zinc-500">
              No allergies or exclusions declared.
            </p>
          )}
        </ul>
        <AddFoodPreferenceForm taxonomy={taxonomy} foodItems={foodItems} />
      </section>
    </main>
  );
}
