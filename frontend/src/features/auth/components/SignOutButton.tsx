'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getCsrfToken } from 'next-auth/react';

// Same plain-form reasoning as SignInButton: Auth.js's own POST endpoint,
// not signOut() or a Server Action. Clears only this app's host-only
// session cookie — login.blonskyi.dev's own session is untouched, so this
// is a sign-out of fitness, not of every project (ADR-018).
export function SignOutButton() {
  const t = useTranslations('SignIn');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    getCsrfToken()
      .then((token) => setCsrfToken(token ?? null))
      .catch(() => setCsrfToken(null));
  }, []);

  return (
    <form method="POST" action="/api/auth/signout">
      <input type="hidden" name="csrfToken" value={csrfToken ?? ''} />
      <button
        type="submit"
        disabled={!csrfToken}
        title={t('signOut')}
        className="chip cursor-pointer text-ink transition-colors hover:bg-hover"
      >
        {t('signOut')}
      </button>
    </form>
  );
}
