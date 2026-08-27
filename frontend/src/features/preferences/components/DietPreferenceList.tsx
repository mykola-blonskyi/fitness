import {
  DIET_TYPE_LABELS,
  type DietPreference,
} from '@shared/types/preferences';
import { removeDietPreference } from '@features/preferences/actions';

interface DietPreferenceListProps {
  preferences: DietPreference[];
}

export const DietPreferenceList = ({
  preferences,
}: DietPreferenceListProps) => {
  return (
    <ul className="flex flex-col gap-2">
      {preferences.map((preference) => (
        <li
          key={preference.id}
          className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <span className="text-sm">
            {DIET_TYPE_LABELS[preference.dietType]}
          </span>
          <form action={removeDietPreference.bind(null, preference.id)}>
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
        <p className="text-sm text-zinc-500">No diet type declared.</p>
      )}
    </ul>
  );
};
