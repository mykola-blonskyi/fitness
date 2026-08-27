import type { FoodPreference } from '@shared/types/preferences';
import { removeFoodPreference } from '@features/preferences/actions';

const TYPE_LABELS: Record<FoodPreference['type'], string> = {
  allergy: 'Allergy',
  exclude: 'Exclude',
};

interface FoodPreferenceListProps {
  preferences: FoodPreference[];
}

export const FoodPreferenceList = ({
  preferences,
}: FoodPreferenceListProps) => {
  return (
    <ul className="flex flex-col gap-2">
      {preferences.map((preference) => (
        <li
          key={preference.id}
          className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <span className="text-sm">
            {TYPE_LABELS[preference.type]} &middot;{' '}
            {preference.targetName ?? 'Unknown'}
          </span>
          <form action={removeFoodPreference.bind(null, preference.id)}>
            <button
              type="submit"
              className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Remove
            </button>
          </form>
        </li>
      ))}
      {preferences.length === 0 && (
        <p className="text-sm text-zinc-500">
          No allergies or exclusions declared.
        </p>
      )}
    </ul>
  );
};
