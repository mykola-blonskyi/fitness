import type { ReactNode } from 'react';
import { Rail } from '@shared/ui/shell/Rail';
import { TopBar } from '@shared/ui/shell/TopBar';
import { MobileTabs } from '@shared/ui/shell/MobileTabs';

export interface ShellIdentity {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
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
  return (
    <div className="flex min-h-full flex-1">
      <Rail locale={locale} isAdmin={identity.isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar identity={identity} />
        {children}
        <MobileTabs locale={locale} isAdmin={identity.isAdmin} />
      </div>
    </div>
  );
}
