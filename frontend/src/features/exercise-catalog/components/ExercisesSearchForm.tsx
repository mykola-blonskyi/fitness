import { getTranslations } from 'next-intl/server';
import { EXERCISE_CATEGORIES } from '@shared/types/exercise';

interface ExercisesSearchFormProps {
  category?: string;
  search?: string;
}

export const ExercisesSearchForm = async ({
  category,
  search,
}: ExercisesSearchFormProps) => {
  const t = await getTranslations('Exercises.searchForm');
  const tc = await getTranslations('ExerciseCategories');
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
          {EXERCISE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tc(c)}
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
