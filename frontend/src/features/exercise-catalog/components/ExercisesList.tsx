'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  EXERCISE_CATEGORY_LABELS,
  type Exercise,
} from '@shared/types/exercise';
import type { UserProfile } from '@shared/types/user';
import { listExercises } from '@features/exercise-catalog/actions';
import { unapproveExercise } from '@features/admin-exercises/actions';

const ROW_HEIGHT = 72;

interface ExercisesListProps {
  initialItems: Exercise[];
  initialCursor: string | null;
  category?: string;
  search?: string;
  profile: UserProfile;
}

export const ExercisesList = ({
  initialItems,
  initialCursor,
  category,
  search,
  profile,
}: ExercisesListProps) => {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Resyncs when the parent Server Component re-fetches (filter change,
  // or CreateExerciseForm's router.refresh()).
  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
  }, [initialItems, initialCursor]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualItem = virtualItems[virtualItems.length - 1];

  async function loadMore(after: string) {
    setLoadingMore(true);
    const page = await listExercises(after, category, search);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }

  useEffect(() => {
    if (!lastVirtualItem || loadingMore || !cursor) return;
    if (lastVirtualItem.index >= items.length - 1) {
      void loadMore(cursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVirtualItem?.index, items.length, cursor, loadingMore]);

  async function handleUnapprove(id: string) {
    setPendingIds((prev) => new Set(prev).add(id));
    const result = await unapproveExercise(id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (result.error) {
      setRowErrors((prev) => ({ ...prev, [id]: result.error! }));
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  if (items.length === 0 && !cursor) {
    return (
      <p className="py-6 text-sm text-zinc-500">
        No exercises match this filter.
      </p>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[60vh] w-full overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualItems.map((virtualRow) => {
          const exercise = items[virtualRow.index];
          if (!exercise) return null;

          return (
            <div
              key={exercise.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="flex items-center gap-4 border-b border-zinc-100 px-4 py-3 dark:border-zinc-900"
            >
              {exercise.imageUrl ? (
                <Image
                  src={exercise.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-10 shrink-0 rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{exercise.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {EXERCISE_CATEGORY_LABELS[exercise.category]}
                </p>
                {rowErrors[exercise.id] && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {rowErrors[exercise.id]}
                  </p>
                )}
              </div>

              {profile.isAdmin && (
                <button
                  type="button"
                  disabled={pendingIds.has(exercise.id)}
                  onClick={() => handleUnapprove(exercise.id)}
                  className="shrink-0 text-sm text-zinc-500 underline hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
                >
                  Unapprove
                </button>
              )}
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <p className="py-3 text-center text-sm text-zinc-500">Loading more…</p>
      )}
    </div>
  );
};
