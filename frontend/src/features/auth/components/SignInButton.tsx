'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getCsrfToken } from 'next-auth/react';

// A plain HTML form POSTing straight to Auth.js's own endpoint,
// deliberately not signIn() or a Server Action: Next.js replays a Server
// Action whose result is an external navigation (root-caused in the hub's
// own conversion).
export function SignInButton({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations('SignIn');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const loadCsrfToken = useCallback(() => {
    getCsrfToken()
      .then((token) => {
        setFailed(!token);
        if (token) setCsrfToken(token);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    loadCsrfToken();
  }, [loadCsrfToken]);

  // Without a token the form can only be rejected, so offer a retry
  // rather than a permanently disabled button and no explanation.
  if (failed) {
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="text-sm text-danger">{t('error')}</p>
        <button
          type="button"
          onClick={loadCsrfToken}
          className="btn-ghost w-full"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <form method="POST" action="/api/auth/signin/login" className="w-full">
      <input type="hidden" name="csrfToken" value={csrfToken ?? ''} />
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      <button
        type="submit"
        disabled={!csrfToken}
        className="btn-primary w-full"
      >
        {t('button')}
      </button>
    </form>
  );
}
