'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { listFoodItems, type FoodItem } from '@features/food-catalog/actions';

// Search-driven, like features/exercise-catalog/components/ExercisePicker.tsx
// (FITNESS-65): the page used to hand these forms one 100-item page and
// filter it in the browser, so anything past that page was unreachable -
// which is most of the catalog, and all of it for a translated name that
// happened to fall outside the page.
const RESULTS_LIMIT = 100;

export function FoodItemPicker({
  id,
  field,
}: {
  id: string;
  field: UseFormRegisterReturn;
}) {
  const t = useTranslations('Preferences.picker');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const page = await listFoodItems({
          search: search || undefined,
          limit: RESULTS_LIMIT,
        });
        if (!cancelled) setItems(page.items);
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
    <>
      <label htmlFor={`${id}Search`} className="label">
        {t('searchLabel')}
      </label>
      <input
        id={`${id}Search`}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('searchPlaceholder')}
        className="input"
      />

      <label htmlFor={id} className="label">
        {t('itemLabel')}
      </label>
      <select id={id} className="input" {...field}>
        <option value="">{t('selectPlaceholder')}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-sm text-muted">{t('loading')}</p>}
      {!isLoading && !error && items.length === 0 && (
        <p className="text-sm text-muted">{t('empty')}</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </>
  );
}
