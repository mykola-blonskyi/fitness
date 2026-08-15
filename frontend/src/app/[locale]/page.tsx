import { apiFetch } from "@/shared/libs/api-client";

// Shape of the backend's GET /me response (backend/src/identity/identity.types.ts).
interface Me {
  hubUserId: string;
  email: string;
}

export default async function Home() {
  // Proves the full chain: proxy.ts resolved this request's identity ->
  // apiFetch forwarded it -> the backend's IdentityGuard trusted it.
  const me = await apiFetch<Me>("/me");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">fitness.blonskyi.dev</h1>
      <p className="text-sm text-zinc-500">Signed in as {me.email}</p>
    </main>
  );
}
