import { getTranslations } from 'next-intl/server';
import { Page } from '@shared/ui/components/Page';
import { Skeleton } from '@shared/ui/components/Skeleton';

export default async function AppLoading() {
  const t = await getTranslations('Loading');

  return (
    <Page>
      <p role="status" className="sr-only">
        {t('label')}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 rounded-ctl" />
      </div>
      <div className="flex flex-col gap-3 md:gap-4">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    </Page>
  );
}
