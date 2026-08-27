import Image from 'next/image';

import {
  EXERCISE_CATEGORY_LABELS,
  type Exercise,
} from '@shared/types/exercise';
import type { UserProfile } from '@shared/types/user';
import { unapproveExercise } from '@features/admin-exercises/actions';

interface ExercisesListProps {
  exercises: Exercise[];
  profile: UserProfile;
}

export const ExercisesList = ({ exercises, profile }: ExercisesListProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2 pr-4">
              <span className="sr-only">Image</span>
            </th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Verified</th>
            {profile.isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => (
            <tr
              key={exercise.id}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2 pr-4">
                {exercise.imageUrl ? (
                  <Image
                    src={exercise.imageUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-md object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="size-10 rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                )}
              </td>
              <td className="py-2 pr-4">{exercise.name}</td>
              <td className="py-2 pr-4">
                {EXERCISE_CATEGORY_LABELS[exercise.category]}
              </td>
              <td className="py-2 pr-4">
                {exercise.isVerified ? 'Yes' : 'No'}
              </td>
              {profile.isAdmin && (
                <td className="py-2 pr-4">
                  {exercise.isVerified && (
                    <form action={unapproveExercise.bind(null, exercise.id)}>
                      <button
                        type="submit"
                        className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        Unapprove
                      </button>
                    </form>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {exercises.length === 0 && (
        <p className="py-6 text-sm text-zinc-500">
          No exercises match this filter.
        </p>
      )}
    </div>
  );
};
