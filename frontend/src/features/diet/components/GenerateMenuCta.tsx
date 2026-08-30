'use client';

import { useGenerateDiet } from '@features/diet/use-generate-diet';
import { GenerateDietError } from '@features/diet/components/GenerateDietError';

export function GenerateMenuCta({ hasTarget }: { hasTarget: boolean }) {
  const { run, isPending, error, preferencesBlocked } = useGenerateDiet();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={!hasTarget || isPending}
        className="bg-foreground text-background self-start rounded px-4 py-2 text-sm transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Generating…' : 'Generate menu'}
      </button>

      {!hasTarget && (
        <p className="text-sm text-zinc-500">
          Log today&apos;s weight first to get a calorie target.
        </p>
      )}

      <GenerateDietError
        error={error}
        preferencesBlocked={preferencesBlocked}
      />
    </div>
  );
}
