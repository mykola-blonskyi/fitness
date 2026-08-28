'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useVirtualizer } from '@tanstack/react-virtual';
import { unapproveFoodItem } from '@features/admin-food-items/actions';
import { listFoodItems, type FoodItem } from '@features/food-catalog/actions';
import type { UserProfile } from '@shared/types/user';

const ROW_HEIGHT = 64;

interface FoodListProps {
  items: FoodItem[];
  nextCursor: string | null;
  category?: string;
  search?: string;
  locale: string;
  profile: UserProfile;
}

export const FoodList = ({
  items: initialItems,
  nextCursor: initialCursor,
  category,
  search,
  locale,
  profile,
}: FoodListProps) => {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

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
    const page = await listFoodItems({
      category,
      search,
      locale,
      cursor: after,
    });
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }

  // Same infinite-load trigger as AdminExerciseQueue: fetch the next page
  // once the last rendered row scrolls into view.
  useEffect(() => {
    if (!lastVirtualItem || loadingMore || !cursor) return;
    if (lastVirtualItem.index >= items.length - 1) {
      void loadMore(cursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVirtualItem?.index, items.length, cursor, loadingMore]);

  if (items.length === 0) {
    return (
      <p className="py-6 text-sm text-zinc-500">
        No food items match this filter.
      </p>
    );
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

              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.name}
              </p>

              <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                <span>{Math.round(item.caloriesPer100g)} kcal</span>
                <span>{item.proteinPer100g.toFixed(1)}g P</span>
                <span>{item.carbsPer100g.toFixed(1)}g C</span>
                <span>{item.fatPer100g.toFixed(1)}g F</span>
              </div>

              {profile.isAdmin && item.isVerified && (
                <form action={unapproveFoodItem.bind(null, item.id)}>
                  <button
                    type="submit"
                    className="shrink-0 text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Unapprove
                  </button>
                </form>
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
