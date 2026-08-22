import Image from 'next/image';
import { CreateExerciseForm } from '@features/exercise-catalog';
import type { Exercise } from '@shared/types/exercise';
import {
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABELS,
} from '@shared/types/exercise';
import { apiFetch } from '@libs/api-client';

// Filtering is a plain GET <form> below - no client JS needed. Native
// form submission re-navigates to ?category=&search=, which re-runs this
// Server Component with the new searchParams (see AGENTS.md: searchParams
// is a promise in this Next.js version, must be awaited).
//
// Unlike food/page.tsx, no `locale` is added to the /exercises query
// string - the backend resolves display names against the caller's own
// stored users.locale preference from the trusted x-user-id header
// apiFetch() already forwards, not a value this page passes in. See
// backend/src/exercises/exercises.service.ts.
export default async function ExerciseCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { category, search } = await searchParams;

  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (search) query.set('search', search);
  const queryString = query.toString();

  const exercises = await apiFetch<Exercise[]>(
    `/exercises${queryString ? `?${queryString}` : ''}`,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Exercise Catalog</h1>

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-4">
                <span className="sr-only">Image</span>
              </th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Verified</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise) => (
              <tr
                key={exercise.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 pr-4">
                  {exercise.imageUrl ? (
                    <Image
                      src={exercise.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-10 rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  )}
                </td>
                <td className="py-2 pr-4">{exercise.name}</td>
                <td className="py-2 pr-4">
                  {EXERCISE_CATEGORY_LABELS[exercise.category]}
                </td>
                <td className="py-2 pr-4">
                  {exercise.isVerified ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {exercises.length === 0 && (
          <p className="py-6 text-sm text-zinc-500">
            No exercises match this filter.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add a custom exercise</h2>
        <CreateExerciseForm />
      </div>
    </main>
  );
}
