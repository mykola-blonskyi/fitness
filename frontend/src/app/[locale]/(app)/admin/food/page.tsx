import { getTranslations } from 'next-intl/server';
import { AdminNav } from '@features/admin';
import { AdminFoodItemQueue } from '@features/admin-food-items';
import { apiFetch } from '@libs/api-client';
import type { AdminFoodItem, CursorPage } from '@shared/types/admin';

export default async function AdminFoodPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Admin.foodPage');
  const firstPage =
    await apiFetch<CursorPage<AdminFoodItem>>('/admin/food-items');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-16">
      <AdminNav locale={locale} active="food" />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <AdminFoodItemQueue
        initialItems={firstPage.items}
        initialCursor={firstPage.nextCursor}
      />
    </main>
  );
}
