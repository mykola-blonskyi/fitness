'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FieldError } from '@shared/ui/components/FieldError';
import { deleteDietItem, swapDietItem } from '@features/diet/actions';
import type { DietItemMutationResult } from '@features/diet/actions';
import { SwapPicker } from '@features/diet/components/SwapPicker';

export function DietItemActions({
  dietId,
  itemId,
  foodItemId,
  role,
  isCounted,
}: {
  dietId: string;
  itemId: string;
  foodItemId: string;
  role: string;
  // A Free Food is served at a fixed portion, so it can only be dropped.
  isCounted: boolean;
}) {
  const t = useTranslations('Diet');
  const router = useRouter();
  const [pending, setPending] = useState<'reroll' | 'delete' | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function run(
    action: 'reroll' | 'delete',
    call: () => Promise<DietItemMutationResult>,
  ) {
    setError(undefined);
    setPending(action);
    try {
      const result = await call();
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError(t('errors.generic'));
    }
    // router.refresh() re-renders the server tree without remounting this
    // component, so a successful call has to clear its pending state too.
    setPending(null);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex gap-2">
        {isCounted && (
          <>
            <button
              type="button"
              onClick={() => run('reroll', () => swapDietItem(dietId, itemId))}
              disabled={pending !== null}
              className="btn-ghost btn-sm"
            >
              {pending === 'reroll'
                ? t('itemActions.rerolling')
                : t('itemActions.reroll')}
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              disabled={pending !== null}
              className="btn-ghost btn-sm"
            >
              {t('itemActions.swap')}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => run('delete', () => deleteDietItem(dietId, itemId))}
          disabled={pending !== null}
          className="btn-ghost btn-sm text-danger"
        >
          {pending === 'delete'
            ? t('itemActions.deleting')
            : t('itemActions.delete')}
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
