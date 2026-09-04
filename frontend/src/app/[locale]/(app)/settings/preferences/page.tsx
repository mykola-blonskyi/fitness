import { getTranslations } from 'next-intl/server';
import { SettingsNav } from '@features/settings';
import {
  AddDietPreferenceForm,
  AddFoodPreferenceForm,
  AddFavoriteFoodForm,
  DietPreferenceList,
  FoodPreferenceList,
  FavoriteFoodList,
} from '@features/preferences';
import type { FoodItem, FoodTaxonomy } from '@features/food-catalog/actions';
import { apiFetch } from '@libs/api-client';
import type { CursorPage } from '@shared/types/admin';
import type { DietPreference, FoodPreference } from '@shared/types/preferences';

export default async function PreferencesSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Preferences');

  const [foodPreferences, dietPreferences, taxonomy, foodItemPage] =
    await Promise.all([
      apiFetch<FoodPreference[]>('/food-preferences'),
      apiFetch<DietPreference[]>('/diet-preferences'),
      apiFetch<FoodTaxonomy>('/food-items/taxonomy'),
      // limit=100: the exclusion picker below filters this client-side
      // and caps its own render at 50 - no need for the picker to paginate.
      apiFetch<CursorPage<FoodItem>>('/food-items?limit=100'),
    ]);

  const exclusionPreferences = foodPreferences.filter(
    (p) => p.type !== 'favorite',
  );
  const favoritePreferences = foodPreferences.filter(
    (p) => p.type === 'favorite',
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <SettingsNav locale={locale} active="preferences" />
      <h1 className="text-2xl font-extrabold md:text-[26px]">
        {t('pageTitle')}
      </h1>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('dietTypeHeading')}</h2>
        <DietPreferenceList preferences={dietPreferences} />
        <AddDietPreferenceForm
          alreadySelected={dietPreferences.map((p) => p.dietType)}
        />
      </section>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('allergiesHeading')}</h2>
        <FoodPreferenceList preferences={exclusionPreferences} />
        <AddFoodPreferenceForm
          taxonomy={taxonomy}
          foodItems={foodItemPage.items}
        />
      </section>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('favoritesHeading')}</h2>
        <FavoriteFoodList preferences={favoritePreferences} />
        <AddFavoriteFoodForm foodItems={foodItemPage.items} />
      </section>
    </main>
  );
}
