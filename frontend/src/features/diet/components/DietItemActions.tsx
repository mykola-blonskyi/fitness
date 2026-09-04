'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Diet');
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
      setError(t('errors.generic'));
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
          className="btn-ghost btn-sm"
        >
          {isRerolling ? t('itemActions.rerolling') : t('itemActions.reroll')}
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
          className="btn-ghost btn-sm"
        >
          {t('itemActions.swap')}
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
