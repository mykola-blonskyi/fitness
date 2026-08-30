'use client';

import { useState } from 'react';
import { useGenerateDiet } from '@features/diet/use-generate-diet';
import { GenerateDietError } from '@features/diet/components/GenerateDietError';

export function RegenerateButton() {
  const { run, isPending, error, preferencesBlocked } = useGenerateDiet();
  const [confirming, setConfirming] = useState(false);

  async function onConfirm() {
    const done = await run();
    if (done) setConfirming(false);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start rounded border border-zinc-300 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Regenerate
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            This builds a fresh menu and discards any swaps.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="bg-foreground text-background rounded px-4 py-2 text-sm transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Regenerating…' : 'Regenerate menu'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="rounded border border-zinc-300 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <GenerateDietError
        error={error}
        preferencesBlocked={preferencesBlocked}
      />
    </div>
  );
}
