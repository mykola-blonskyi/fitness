'use client';

import { useTranslations } from 'next-intl';
import { useCsrfToken } from '@libs/use-csrf-token';

// Clears only this app's own host-only cookie; login's IdP session is
// untouched, so this signs the user out of fitness, not of every project
// (ADR-018).
export function SignOutButton() {
  const t = useTranslations('SignIn');
  const { csrfToken, failed, reload } = useCsrfToken();

  if (failed) {
    return (
      <button
        type="button"
        onClick={reload}
        className="chip cursor-pointer text-ink transition-colors hover:bg-hover"
      >
        {t('retry')}
      </button>
    );
  }

  return (
    <form method="POST" action="/api/auth/signout">
      <input type="hidden" name="csrfToken" value={csrfToken ?? ''} />
      <button
        type="submit"
        disabled={!csrfToken}
        className="chip cursor-pointer text-ink transition-colors hover:bg-hover"
      >
        {t('signOut')}
      </button>
    </form>
  );
}
