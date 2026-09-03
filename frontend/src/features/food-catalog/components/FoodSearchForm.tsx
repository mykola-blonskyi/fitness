import { getTranslations } from 'next-intl/server';
import type { FoodTaxonomy } from '@features/food-catalog/actions';

interface FoodSearchFormProps {
  taxonomy: FoodTaxonomy;
  category?: string;
  search?: string;
}

export const FoodSearchForm = async ({
  taxonomy,
  category,
  search,
}: FoodSearchFormProps) => {
  const t = await getTranslations('Food.searchForm');
  return (
    <form className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium">
          {t('categoryLabel')}
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category ?? ''}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{t('allCategories')}</option>
          {taxonomy.categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="search" className="text-sm font-medium">
          {t('searchLabel')}
        </label>
        <input
          id="search"
          name="search"
          type="search"
          defaultValue={search ?? ''}
          placeholder={t('searchPlaceholder')}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="submit"
        className="bg-foreground text-background rounded px-4 py-2"
      >
        {t('submit')}
      </button>
    </form>
  );
};
