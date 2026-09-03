'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AdminExercise } from '@shared/types/admin';
import {
  approveExercise,
  deleteExercise,
  listAdminExercises,
} from '@features/admin-exercises/actions';

const ROW_HEIGHT = 88;

export function AdminExerciseQueue({
  initialItems,
  initialCursor,
}: {
  initialItems: AdminExercise[];
  initialCursor: string | null;
}) {
  const t = useTranslations('Admin.queue');
  const tc = useTranslations('ExerciseCategories');
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

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
    const page = await listAdminExercises(after);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }

  // The standard TanStack Virtual infinite-load trigger: fetch the next
  // page once the last rendered row comes into view. Cursor always comes
  // from the server's own nextCursor, computed off the last row it
  // actually returned - not off `items`, which can shrink mid-scroll as
  // rows are approved/deleted - so pagination never skips or repeats.
  useEffect(() => {
    if (!lastVirtualItem || loadingMore || !cursor) return;
    if (lastVirtualItem.index >= items.length - 1) {
      void loadMore(cursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVirtualItem?.index, items.length, cursor, loadingMore]);

  function setPending(id: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleApprove(id: string) {
    setPending(id, true);
    const result = await approveExercise(id);
    setPending(id, false);
    if (result.error) {
      setRowErrors((prev) => ({ ...prev, [id]: result.error! }));
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleDelete(id: string) {
    setPending(id, true);
    const result = await deleteExercise(id);
    setPending(id, false);
    setConfirmingId(null);
    if (result.error) {
      setRowErrors((prev) => ({ ...prev, [id]: result.error! }));
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  if (items.length === 0 && !cursor) {
    return <p className="py-6 text-sm text-zinc-500">{t('empty')}</p>;
  }

  return (
    <div
      ref={parentRef}
      className="h-[70vh] w-full overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualItems.map((virtualRow) => {
          const exercise = items[virtualRow.index];
          if (!exercise) return null;
          const isPending = pendingIds.has(exercise.id);

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
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-12 shrink-0 rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{exercise.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {tc(exercise.category)} &middot;{' '}
                  {exercise.source ?? t('manualSource')}
                  {exercise.sourceId ? ` #${exercise.sourceId}` : ''}
                </p>
                {rowErrors[exercise.id] && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {rowErrors[exercise.id]}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {confirmingId === exercise.id ? (
                  <>
                    <span className="text-xs text-zinc-500">
                      {t('confirmDelete')}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(exercise.id)}
                      className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {t('confirm')}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmingId(null)}
                      className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                    >
                      {t('cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleApprove(exercise.id)}
                      className="bg-foreground text-background rounded px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {t('approve')}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmingId(exercise.id)}
                      className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
                    >
                      {t('delete')}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <p className="py-3 text-center text-sm text-zinc-500">
          {t('loadingMore')}
        </p>
      )}
    </div>
  );
}
