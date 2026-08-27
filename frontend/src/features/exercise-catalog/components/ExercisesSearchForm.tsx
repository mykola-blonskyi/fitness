import {
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABELS,
} from '@shared/types/exercise';

interface ExercisesSearchFormProps {
  category?: string;
  search?: string;
}

export const ExercisesSearchForm = ({
  category,
  search,
}: ExercisesSearchFormProps) => {
  return (
    <form className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category ?? ''}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All categories</option>
          {EXERCISE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXERCISE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="search" className="text-sm font-medium">
          Search
        </label>
        <input
          id="search"
          name="search"
          type="search"
          defaultValue={search ?? ''}
          placeholder="Exercise name…"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="submit"
        className="bg-foreground text-background rounded px-4 py-2"
      >
        Filter
      </button>
    </form>
  );
};
