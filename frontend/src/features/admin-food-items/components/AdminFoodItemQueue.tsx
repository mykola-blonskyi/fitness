'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AdminFoodItem } from '@shared/types/admin';
import {
  approveFoodItem,
  deleteFoodItem,
  listAdminFoodItems,
} from '@features/admin-food-items/actions';

const ROW_HEIGHT = 104;

export function AdminFoodItemQueue({
  initialItems,
  initialCursor,
}: {
  initialItems: AdminFoodItem[];
  initialCursor: string | null;
}) {
  const t = useTranslations('Admin.queue');
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
    const page = await listAdminFoodItems(after);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }

  // Cursor comes from the server's own nextCursor, not off `items` -
  // `items` can shrink mid-scroll as rows are approved/deleted.
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
    const result = await approveFoodItem(id);
    setPending(id, false);
    if (result.error) {
      setRowErrors((prev) => ({ ...prev, [id]: result.error! }));
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleDelete(id: string) {
    setPending(id, true);
    const result = await deleteFoodItem(id);
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
          const item = items[virtualRow.index];
          if (!item) return null;
          const isPending = pendingIds.has(item.id);

          return (
            <div
              key={item.id}
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
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
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
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {item.category} &middot; {item.subcategory} &middot;{' '}
                  {item.role}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {Math.round(item.caloriesPer100g)} kcal &middot; P{' '}
                  {item.proteinPer100g.toFixed(1)}g &middot; C{' '}
                  {item.carbsPer100g.toFixed(1)}g &middot; F{' '}
                  {item.fatPer100g.toFixed(1)}g &middot;{' '}
                  {item.source ?? t('manualSource')}
                  {item.sourceId ? ` #${item.sourceId}` : ''}
                </p>
                {rowErrors[item.id] && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {rowErrors[item.id]}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {confirmingId === item.id ? (
                  <>
                    <span className="text-xs text-zinc-500">
                      {t('confirmDelete')}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(item.id)}
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
                      onClick={() => handleApprove(item.id)}
                      className="bg-foreground text-background rounded px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {t('approve')}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmingId(item.id)}
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
