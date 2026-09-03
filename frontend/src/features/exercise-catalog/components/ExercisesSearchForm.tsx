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
          {EXERCISE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tc(c)}
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
