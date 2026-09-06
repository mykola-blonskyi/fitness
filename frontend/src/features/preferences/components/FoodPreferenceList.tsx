import { getTranslations } from 'next-intl/server';
import type { FoodPreference } from '@shared/types/preferences';
import { foodPreferenceTargetLabel } from '@libs/food-taxonomy-label';
import { removeFoodPreference } from '@features/preferences/actions';

interface FoodPreferenceListProps {
  preferences: FoodPreference[];
}

export const FoodPreferenceList = async ({
  preferences,
}: FoodPreferenceListProps) => {
  const [t, tTypes, tTaxonomy] = await Promise.all([
    getTranslations('Preferences.foodList'),
    getTranslations('Preferences.typeLabels'),
    getTranslations(),
  ]);
  return (
    <ul className="flex flex-col gap-2">
      {preferences.map((preference) => (
        <li
          key={preference.id}
          className="flex items-center justify-between rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
        >
          <span className="text-sm">
            {tTypes(preference.type)} &middot;{' '}
            {preference.targetName === null
              ? t('unknown')
              : foodPreferenceTargetLabel(
                  preference.targetType,
                  preference.targetName,
                  tTaxonomy,
                )}
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
