import { AdminNav } from '@features/admin';

export default async function AdminFoodPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-16">
      <AdminNav locale={locale} active="food" />
      <h1 className="text-2xl font-semibold">Food moderation</h1>
      <p className="text-sm text-zinc-500">Coming soon.</p>
    </main>
  );
}
