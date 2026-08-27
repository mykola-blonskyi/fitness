import { SettingsNav } from '@features/settings';
import {
  AddDietPreferenceForm,
  AddFoodPreferenceForm,
  DietPreferenceList,
  FoodPreferenceList,
} from '@features/preferences';
import type { FoodItem, FoodTaxonomy } from '@features/food-catalog/actions';
import { apiFetch } from '@libs/api-client';
import type { DietPreference, FoodPreference } from '@shared/types/preferences';

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
        <DietPreferenceList preferences={dietPreferences} />
        <AddDietPreferenceForm
          alreadySelected={dietPreferences.map((p) => p.dietType)}
        />
      </section>

      <section className="flex w-full max-w-sm flex-col gap-3">
        <h2 className="text-lg font-semibold">Allergies &amp; exclusions</h2>
        <FoodPreferenceList preferences={foodPreferences} />
        <AddFoodPreferenceForm taxonomy={taxonomy} foodItems={foodItems} />
      </section>
    </main>
  );
}
