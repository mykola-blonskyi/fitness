import { getTranslations } from 'next-intl/server';
import {
  CreateFoodItemForm,
  FoodList,
  FoodSearchForm,
} from '@features/food-catalog';
import type { CursorPage } from '@shared/types/admin';
import type { FoodItem, FoodTaxonomy } from '@features/food-catalog/actions';
import type { UserProfile } from '@shared/types/user';
import { apiFetch } from '@libs/api-client';

// Filtering is a plain GET <form> below - no client JS needed. Native
// form submission re-navigates to ?category=&search=, which re-runs this
// Server Component with the new searchParams (see AGENTS.md: searchParams
// is a promise in this Next.js version, must be awaited).
export default async function FoodCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { locale } = await params;
  const { category, search } = await searchParams;
  const t = await getTranslations('Food');

  const query = new URLSearchParams({ locale });
  if (category) query.set('category', category);
  if (search) query.set('search', search);

  const [firstPage, taxonomy, profile] = await Promise.all([
    apiFetch<CursorPage<FoodItem>>(`/food-items?${query.toString()}`),
    apiFetch<FoodTaxonomy>('/food-items/taxonomy'),
    apiFetch<UserProfile>('/users/me'),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('pageTitle')}</h1>

      <FoodSearchForm taxonomy={taxonomy} category={category} search={search} />

      <FoodList
        key={`${category ?? ''}:${search ?? ''}`}
        items={firstPage.items}
        nextCursor={firstPage.nextCursor}
        category={category}
        search={search}
        locale={locale}
        profile={profile}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('addCustomHeading')}</h2>
        <CreateFoodItemForm taxonomy={taxonomy} />
      </div>
    </main>
  );
}
