'use client';

import { useTranslations } from 'next-intl';
import { OfflineIndicator } from '@shared/ui/components/OfflineIndicator';
import { LanguageSwitcher } from '@shared/ui/components/LanguageSwitcher';
import { useActiveNavKey } from '@shared/ui/shell/NavLink';
import { SignOutButton } from '@features/auth';

interface TopBarProps {
  identity: { userId: string; name: string; email: string };
}

export function TopBar({ identity }: TopBarProps) {
  const t = useTranslations('Header');
  const active = useActiveNavKey();
  const initial = (identity.name || identity.email)
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="topbar sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-line-soft bg-[color:var(--topbar)] px-4 backdrop-blur md:px-7">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="font-display text-base md:hidden">{t('brand')}</span>
        <span className="hidden md:inline">
          {active ? t(`nav.${active}`) : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="chip">
          <OfflineIndicator userId={identity.userId} />
        </span>
        <LanguageSwitcher />
        <span className="chip !border-accent !bg-accent text-accent-ink">
          <span className="flex size-5 items-center justify-center rounded-full bg-inv text-[10px] font-bold text-inv-ink">
            {initial}
          </span>
          <span className="hidden sm:inline">
            {identity.name || identity.email}
          </span>
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
