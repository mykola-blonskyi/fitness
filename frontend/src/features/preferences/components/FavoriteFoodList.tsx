'use client';

import { useTranslations } from 'next-intl';
import type { FoodPreference } from '@shared/types/preferences';
import { removeFoodPreference } from '@features/preferences/actions';

interface FavoriteFoodListProps {
  preferences: FoodPreference[];
}

export const FavoriteFoodList = ({ preferences }: FavoriteFoodListProps) => {
  const t = useTranslations('Preferences.favoriteList');
  return (
    <ul className="flex flex-col gap-2">
      {preferences.map((preference) => (
        <li
          key={preference.id}
          className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <span className="text-sm">
            {preference.targetName ?? t('unknown')}
          </span>
          <form action={removeFoodPreference.bind(null, preference.id)}>
            <button
              type="submit"
              className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {t('remove')}
            </button>
          </form>
        </li>
      ))}
      {preferences.length === 0 && (
        <p className="text-sm text-zinc-500">{t('empty')}</p>
      )}
    </ul>
  );
};
