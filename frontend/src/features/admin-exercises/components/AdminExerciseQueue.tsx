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
    return <p className="py-6 text-sm text-muted">{t('empty')}</p>;
  }

  return (
    <div ref={parentRef} className="card h-[70vh] w-full overflow-y-auto">
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
              className="flex items-center gap-4 border-b border-line-soft px-4 py-3"
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
                  className="size-12 shrink-0 rounded-md border border-line bg-surface-2"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{exercise.name}</p>
                <p className="truncate text-xs text-muted">
                  {tc(exercise.category)} &middot;{' '}
                  {exercise.source ?? t('manualSource')}
                  {exercise.sourceId ? ` #${exercise.sourceId}` : ''}
                </p>
                {rowErrors[exercise.id] && (
                  <p className="text-xs text-danger">
                    {rowErrors[exercise.id]}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {confirmingId === exercise.id ? (
                  <>
                    <span className="text-xs text-muted">
                      {t('confirmDelete')}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(exercise.id)}
                      className="rounded bg-danger px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {t('confirm')}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmingId(null)}
                      className="input"
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
                      className="btn-primary btn-sm"
                    >
                      {t('approve')}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmingId(exercise.id)}
                      className="rounded border border-danger px-3 py-2 text-sm text-danger disabled:opacity-50"
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
        <p className="py-3 text-center text-sm text-muted">
          {t('loadingMore')}
        </p>
      )}
    </div>
  );
}
