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
          className="flex items-center justify-between rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
        >
          <span className="text-sm">
            {preference.targetName ?? t('unknown')}
          </span>
          <form action={removeFoodPreference.bind(null, preference.id)}>
            <button
              type="submit"
              className="text-sm text-muted underline hover:text-ink"
            >
              {t('remove')}
            </button>
          </form>
        </li>
      ))}
      {preferences.length === 0 && (
        <p className="text-sm text-muted">{t('empty')}</p>
      )}
    </ul>
  );
};
