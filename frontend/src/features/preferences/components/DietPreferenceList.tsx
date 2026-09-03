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
          className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <span className="text-sm">{tDietTypes(preference.dietType)}</span>
          <form action={removeDietPreference.bind(null, preference.id)}>
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
