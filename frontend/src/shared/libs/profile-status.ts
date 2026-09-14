import type { Identity } from '@shared/types/identity';

export type ProfileStatus = 'complete' | 'missing' | 'unknown';

// Never throws. 'unknown' is deliberately not 'missing': a restarting backend
// must not push an established user into the first-run onboarding form.
export async function fetchProfileStatus(
  backendUrl: string,
  identity: Identity,
): Promise<ProfileStatus> {
  let res: Response;
  try {
    res = await fetch(`${backendUrl}/users/me`, {
      headers: {
        'x-user-id': identity.sub,
        'x-user-email': identity.email,
      },
      cache: 'no-store',
    });
  } catch {
    return 'unknown';
  }

  if (res.ok) return 'complete';
  return res.status === 404 ? 'missing' : 'unknown';
}
