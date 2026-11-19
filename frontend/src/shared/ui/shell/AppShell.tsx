import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Rail } from '@shared/ui/shell/Rail';
import { TopBar } from '@shared/ui/shell/TopBar';
import { MobileTabs } from '@shared/ui/shell/MobileTabs';

export interface ShellIdentity {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isDemo: boolean;
}

// One shell for every screen: rail on desktop, icon rail on tablet, bottom
// tabs on mobile. Pages render their own <main>; see PageHeader/Page.
export function AppShell({
  locale,
  identity,
  children,
}: {
  locale: string;
  identity: ShellIdentity;
  children: ReactNode;
}) {
  const t = useTranslations('Header');

  return (
    <div className="flex min-h-full flex-1">
      <Rail
        locale={locale}
        isAdmin={identity.isAdmin}
        isDemo={identity.isDemo}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {identity.isDemo && (
          <p className="border-b border-line-soft bg-accent-soft px-4 py-2 text-center text-xs font-semibold text-accent-strong md:px-7">
            {t('demoBanner')}
          </p>
        )}
        <TopBar identity={identity} />
        {children}
        <MobileTabs
          locale={locale}
          isAdmin={identity.isAdmin}
          isDemo={identity.isDemo}
        />
      </div>
    </div>
  );
}
