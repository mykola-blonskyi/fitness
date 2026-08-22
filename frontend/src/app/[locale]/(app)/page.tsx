import type { DailyLog } from '@features/daily-log/actions';
import { apiFetch, ApiError } from '@libs/api-client';

// Shape of the backend's GET /me response (backend/src/identity/identity.types.ts).
interface Me {
  hubUserId: string;
  email: string;
}

export default async function Home() {
  // Proves the full chain: proxy.ts resolved this request's identity ->
  // apiFetch forwarded it -> the backend's IdentityGuard trusted it.
  const me = await apiFetch<Me>('/me');

  let latestWeighIn: DailyLog | null = null;
  try {
    latestWeighIn = await apiFetch<DailyLog>('/daily-logs/latest-weigh-in');
  } catch (err) {
    // No weigh-in ever logged is expected for a new user — anything else
    // (auth failure, backend down) should surface as a real error, same
    // pattern as the diary page's DailyLog 404 handling.
    if (!(err instanceof ApiError && err.status === 404)) {
      throw err;
    }
    latestWeighIn = null;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">fitness.blonskyi.dev</h1>
      <p className="text-sm text-zinc-500">Signed in as {me.email}</p>
      {/* FITNESS-15 acceptance criterion is the date only - weight
          alongside a goal is a separate, not-yet-built FITNESS-3 user
          story, so it's deliberately not shown here. */}
      <p className="text-sm text-zinc-500">
        {latestWeighIn
          ? `Last weigh-in: ${latestWeighIn.date}`
          : 'No weigh-ins logged yet'}
      </p>
    </main>
  );
}
