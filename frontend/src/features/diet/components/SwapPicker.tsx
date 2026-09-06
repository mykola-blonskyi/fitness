'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FieldError } from '@shared/ui/components/FieldError';
import { listSwapCandidates, swapDietItem } from '@features/diet/actions';
import type { FoodItem } from '@features/food-catalog/actions';

export function SwapPicker({
  dietId,
  itemId,
  role,
  currentFoodItemId,
  onDone,
}: {
  dietId: string;
  itemId: string;
  role: string;
  currentFoodItemId: string;
  onDone: () => void;
}) {
  const t = useTranslations('Diet');
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setIsLoading(true);
      try {
        const items = await listSwapCandidates(role, search || undefined);
        if (!cancelled) {
          setCandidates(items.filter((item) => item.id !== currentFoodItemId));
        }
      } catch {
        if (!cancelled) setError(t('swapPicker.loadError'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [role, search, currentFoodItemId, t]);

  async function onSelect(foodItemId: string) {
    setError(undefined);
    setSubmittingId(foodItemId);
    try {
      const result = await swapDietItem(dietId, itemId, foodItemId);
      if (result.ok) {
        onDone();
        return;
      }
      setError(result.error);
    } catch {
      setError(t('errors.generic'));
    }
    setSubmittingId(null);
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded border border-line p-3 sm:w-72">
      <label className="sr-only" htmlFor={`swap-search-${itemId}`}>
        {t('swapPicker.searchLabel', { role: role.replace(/_/g, ' ') })}
      </label>
      <input
        id={`swap-search-${itemId}`}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('swapPicker.searchPlaceholder')}
        className="rounded border border-line bg-transparent px-2 py-1 text-sm"
      />

      {isLoading && (
        <p className="text-xs text-muted">{t('swapPicker.loading')}</p>
      )}

      {!isLoading && candidates.length === 0 && (
        <p className="text-xs text-muted">{t('swapPicker.empty')}</p>
      )}

      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              onClick={() => onSelect(candidate.id)}
              disabled={submittingId !== null}
              className="flex w-full flex-col rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-hover disabled:opacity-50"
            >
              <span>{candidate.name}</span>
              <span className="text-xs text-muted">
                {t('swapPicker.caloriesPer100g', {
                  calories: candidate.caloriesPer100g,
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <FieldError message={error} />
    </div>
  );
}
