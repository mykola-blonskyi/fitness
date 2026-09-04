import { getTranslations } from 'next-intl/server';
import type { DietPreference } from '@shared/types/preferences';
import { removeDietPreference } from '@features/preferences/actions';

interface DietPreferenceListProps {
  preferences: DietPreference[];
}

export const DietPreferenceList = async ({
  preferences,
}: DietPreferenceListProps) => {
  const [t, tDietTypes] = await Promise.all([
    getTranslations('Preferences.dietList'),
    getTranslations('Preferences.dietTypes'),
  ]);
  return (
    <ul className="flex flex-col gap-2">
      {preferences.map((preference) => (
        <li
          key={preference.id}
          className="flex items-center justify-between rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
        >
          <span className="text-sm">{tDietTypes(preference.dietType)}</span>
          <form action={removeDietPreference.bind(null, preference.id)}>
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
