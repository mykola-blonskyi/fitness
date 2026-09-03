'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { generateDiet } from '@features/diet/actions';

export function useGenerateDiet() {
  const t = useTranslations('Diet.errors');
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [preferencesBlocked, setPreferencesBlocked] = useState(false);

  async function run(): Promise<boolean> {
    setError(undefined);
    setPreferencesBlocked(false);
    setIsPending(true);
    try {
      const result = await generateDiet();
      if (result.ok) {
        router.refresh();
        return true;
      }
      setError(result.error);
      setPreferencesBlocked(result.preferencesBlocked);
    } catch {
      setError(t('generic'));
    }
    setIsPending(false);
    return false;
  }

  return { run, isPending, error, preferencesBlocked };
}
