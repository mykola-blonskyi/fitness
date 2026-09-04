import { getTranslations } from 'next-intl/server';
import {
  CreateExerciseForm,
  ExercisesList,
  ExercisesSearchForm,
} from '@features/exercise-catalog';
import type { Exercise } from '@shared/types/exercise';
import type { CursorPage } from '@shared/types/admin';
import type { UserProfile } from '@shared/types/user';
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
  const t = await getTranslations('Exercises');

  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (search) query.set('search', search);
  const queryString = query.toString();

  const [firstPage, profile] = await Promise.all([
    apiFetch<CursorPage<Exercise>>(
      `/exercises${queryString ? `?${queryString}` : ''}`,
    ),
    apiFetch<UserProfile>('/users/me'),
  ]);

  return (
    <main className="flex w-full flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <h1 className="text-2xl font-extrabold md:text-[26px]">
        {t('pageTitle')}
      </h1>

      <ExercisesSearchForm category={category} search={search} />

      <ExercisesList
        initialItems={firstPage.items}
        initialCursor={firstPage.nextCursor}
        category={category}
        search={search}
        profile={profile}
      />

      <div className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('addCustomHeading')}</h2>
        <CreateExerciseForm />
      </div>
    </main>
  );
}
