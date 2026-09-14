'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Exercise } from '@shared/types/exercise';
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
  const t = useTranslations('Exercises.list');
  const tc = useTranslations('ExerciseCategories');
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
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
    try {
      const page = await listExercises(after, category, search);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setLoadError(t('loadError'));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!lastVirtualItem || loadingMore || loadError || !cursor) return;
    if (lastVirtualItem.index >= items.length - 1) {
      void loadMore(cursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVirtualItem?.index, items.length, cursor, loadingMore, loadError]);

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
    return <p className="py-6 text-sm text-muted">{t('empty')}</p>;
  }

  return (
    <div ref={parentRef} className="card h-[60vh] w-full overflow-y-auto">
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
              className="flex items-center gap-4 border-b border-line-soft px-4 py-3"
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
                  className="size-10 shrink-0 rounded-md border border-line bg-surface-2"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{exercise.name}</p>
                <p className="truncate text-xs text-muted">
                  {tc(exercise.category)}
                </p>
                {rowErrors[exercise.id] && (
                  <p className="text-xs text-danger">
                    {rowErrors[exercise.id]}
                  </p>
                )}
              </div>

              {profile.isAdmin && (
                <button
                  type="button"
                  disabled={pendingIds.has(exercise.id)}
                  onClick={() => handleUnapprove(exercise.id)}
                  className="shrink-0 text-sm text-muted underline hover:text-ink disabled:opacity-50"
                >
                  {t('unapprove')}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <p className="py-3 text-center text-sm text-muted">
          {t('loadingMore')}
        </p>
      )}
      {loadError && (
        <p className="py-3 text-center text-sm text-danger">{loadError}</p>
      )}
    </div>
  );
};
