'use client';

import { useTranslations } from 'next-intl';
import type { FoodPreference } from '@shared/types/preferences';
import { foodPreferenceTargetLabel } from '@libs/food-taxonomy-label';
import { removeFoodPreference } from '@features/preferences/actions';

interface FavoriteFoodListProps {
  preferences: FoodPreference[];
}

export const FavoriteFoodList = ({ preferences }: FavoriteFoodListProps) => {
  const t = useTranslations('Preferences.favoriteList');
  const tTaxonomy = useTranslations();
  return (
    <ul className="flex flex-col gap-2">
      {preferences.map((preference) => (
        <li
          key={preference.id}
          className="flex items-center justify-between rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
        >
          <div className="flex flex-col">
            <span className="text-sm">
              {preference.targetName === null
                ? t('unknown')
                : foodPreferenceTargetLabel(
                    preference.targetType,
                    preference.targetName,
                    tTaxonomy,
                  )}
            </span>
            {preference.affectsGeneration === false && (
              <span className="text-xs text-muted">{t('notGenerated')}</span>
            )}
          </div>
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
