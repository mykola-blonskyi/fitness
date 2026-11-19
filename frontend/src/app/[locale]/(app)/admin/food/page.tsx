import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AdminNav } from '@features/admin';
import { AdminFoodItemQueue } from '@features/admin-food-items';
import { apiFetch } from '@libs/api-client';
import type { AdminFoodItem, CursorPage } from '@shared/types/admin';

export default async function AdminFoodPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ authored?: string }>;
}) {
  const { locale } = await params;
  const authored = (await searchParams).authored === 'true';
  const t = await getTranslations('Admin.foodPage');
  const tq = await getTranslations('Admin.queue');
  const firstPage = await apiFetch<CursorPage<AdminFoodItem>>(
    `/admin/food-items${authored ? '?authored=true' : ''}`,
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <AdminNav locale={locale} active="food" />
      <h1 className="text-2xl font-extrabold md:text-[26px]">{t('title')}</h1>
      <Link
        href={`/${locale}/admin/food${authored ? '' : '?authored=true'}`}
        className="text-sm font-semibold text-accent-strong hover:underline"
      >
        {authored ? tq('showAll') : tq('authoredOnly')}
      </Link>
      <AdminFoodItemQueue
        key={String(authored)}
        authored={authored}
        initialItems={firstPage.items}
        initialCursor={firstPage.nextCursor}
      />
    </main>
  );
}
