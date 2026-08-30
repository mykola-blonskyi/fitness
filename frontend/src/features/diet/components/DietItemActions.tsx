'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FieldError } from '@shared/ui/components/FieldError';
import { swapDietItem } from '@features/diet/actions';
import { SwapPicker } from '@features/diet/components/SwapPicker';

export function DietItemActions({
  dietId,
  itemId,
  foodItemId,
  role,
}: {
  dietId: string;
  itemId: string;
  foodItemId: string;
  role: string;
}) {
  const router = useRouter();
  const [isRerolling, setIsRerolling] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onReroll() {
    setError(undefined);
    setIsRerolling(true);
    try {
      const result = await swapDietItem(dietId, itemId);
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error);
    } catch {
      setError('Something went wrong — try again.');
    }
    setIsRerolling(false);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReroll}
          disabled={isRerolling}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {isRerolling ? 'Rerolling…' : 'Reroll'}
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Swap
        </button>
      </div>

      <FieldError message={error} />

      {pickerOpen && (
        <SwapPicker
          dietId={dietId}
          itemId={itemId}
          role={role}
          currentFoodItemId={foodItemId}
          onDone={() => {
            setPickerOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
