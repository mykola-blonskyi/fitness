import type { WorkoutSet } from '@shared/types/workout-log';

export function WorkoutSetList({ sets }: { sets: WorkoutSet[] }) {
  if (sets.length === 0) {
    return <p className="text-sm text-zinc-500">No sets logged yet.</p>;
  }

  const byExercise = new Map<string, WorkoutSet[]>();
  for (const set of sets) {
    const group = byExercise.get(set.exerciseId) ?? [];
    group.push(set);
    byExercise.set(set.exerciseId, group);
  }

  return (
    <ul className="flex flex-col gap-4">
      {[...byExercise.values()].map((group) => (
        <li key={group[0].exerciseId} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{group[0].exerciseName}</h3>
          <ul className="flex flex-col gap-1">
            {group.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="text-zinc-500">Set {set.setNumber}</span>
                <span>
                  {set.durationSeconds != null
                    ? `${set.durationSeconds}s`
                    : `${set.weight} kg × ${set.reps}`}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
