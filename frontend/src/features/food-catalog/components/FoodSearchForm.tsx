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
  const [t, tCategories] = await Promise.all([
    getTranslations('Food.searchForm'),
    getTranslations('FoodCategories'),
  ]);
  return (
    <form className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="label">
          {t('categoryLabel')}
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category ?? ''}
          className="input"
        >
          <option value="">{t('allCategories')}</option>
          {taxonomy.categories.map((c) => (
            <option key={c.id} value={c.name}>
              {tCategories(c.name)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="search" className="label">
          {t('searchLabel')}
        </label>
        <input
          id="search"
          name="search"
          type="search"
          defaultValue={search ?? ''}
          placeholder={t('searchPlaceholder')}
          className="input"
        />
      </div>
      <button type="submit" className="btn-primary">
        {t('submit')}
      </button>
    </form>
  );
};
