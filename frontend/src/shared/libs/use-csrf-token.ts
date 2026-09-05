'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCsrfToken } from 'next-auth/react';

// Auth.js's sign-in/sign-out endpoints are posted to as plain forms (see
// SignInButton), so both need the token fetched client-side first.
export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    getCsrfToken()
      .then((token) => {
        setFailed(!token);
        if (token) setCsrfToken(token);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { csrfToken, failed, reload: load };
}
