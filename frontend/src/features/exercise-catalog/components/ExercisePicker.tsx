'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Exercise } from '@shared/types/exercise';
import { listExercises } from '@features/exercise-catalog/actions';
import { FieldError } from '@shared/ui/components/FieldError';

// Search-driven, like features/diet/components/SwapPicker.tsx - a plain
// <select> of the whole catalog silently truncated past its page cap
// (FITNESS-65) and doesn't scale as the catalog grows.
const RESULTS_LIMIT = 100;

export function ExercisePicker({
  id,
  selectedExercise,
  onSelect,
}: {
  id: string;
  selectedExercise: Exercise | null;
  onSelect: (exercise: Exercise) => void;
}) {
  const t = useTranslations('Exercises.picker');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const page = await listExercises(
          '',
          undefined,
          search || undefined,
          RESULTS_LIMIT,
        );
        if (!cancelled) setResults(page.items);
      } catch {
        if (!cancelled) setError(t('loadError'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, t]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="label">
        {t('searchLabel')}
      </label>
      <input
        id={id}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('searchPlaceholder')}
        className="input"
      />

      {selectedExercise && (
        <p className="text-sm">
          {t('selectedLabel')} <strong>{selectedExercise.name}</strong>
        </p>
      )}

      {isLoading && <p className="text-xs text-muted">{t('loading')}</p>}
      {!isLoading && !error && results.length === 0 && (
        <p className="text-xs text-muted">{t('empty')}</p>
      )}
      {!isLoading && !error && results.length === RESULTS_LIMIT && (
        <p className="text-xs text-muted">{t('refineSearch')}</p>
      )}

      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {results.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onSelect(exercise)}
              className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-hover ${
                exercise.id === selectedExercise?.id ? 'bg-hover' : ''
              }`}
            >
              {exercise.name}
            </button>
          </li>
        ))}
      </ul>

      <FieldError message={error} />
    </div>
  );
}
