'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CloseIcon, MoreIcon } from '@shared/ui/icons';
import { MOBILE_TAB_KEYS, NAV_ITEMS } from '@shared/ui/shell/navigation';
import { NavLink, useActiveNavKey } from '@shared/ui/shell/NavLink';

const tabClass =
  'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-ctl text-[11px] font-semibold text-muted';
const tabActiveClass = '!bg-accent-soft !text-accent-strong';

export function MobileTabs({
  locale,
  isAdmin,
}: {
  locale: string;
  isAdmin: boolean;
}) {
  const t = useTranslations('Header');
  const [open, setOpen] = useState(false);
  const active = useActiveNavKey();

  const tabs = MOBILE_TAB_KEYS.map((key) =>
    NAV_ITEMS.find((item) => item.key === key)!,
  );
  const more = NAV_ITEMS.filter(
    (item) =>
      !MOBILE_TAB_KEYS.includes(item.key) && (!item.adminOnly || isAdmin),
  );
  const moreIsActive =
    active !== undefined && more.some((i) => i.key === active);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav
        aria-label={t('mobileNavLabel')}
        className="sticky bottom-0 z-40 md:hidden"
      >
        {open && (
          <div className="card mx-3 mb-2 flex flex-col gap-1 p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="kicker">{t('nav.more')}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('closeMore')}
                className="flex size-9 items-center justify-center rounded-ctl hover:bg-hover"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
            {more.map((item) => (
              <NavLink
                key={item.key}
                navKey={item.key}
                href={`/${locale}${item.path}`}
                onNavigate={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-ctl px-3 text-sm font-medium"
                activeClassName="bg-inv text-inv-ink"
              >
                <item.icon className="size-4" />
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
          </div>
        )}
        <div className="grid h-[68px] grid-cols-5 gap-1 border-t border-line-soft bg-surface px-2 pb-2 pt-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          {tabs.map((item) => (
            <NavLink
              key={item.key}
              navKey={item.key}
              href={`/${locale}${item.path}`}
              className={tabClass}
              activeClassName={tabActiveClass}
            >
              <item.icon className="size-5" />
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`${tabClass} ${moreIsActive ? tabActiveClass : ''}`}
          >
            <MoreIcon className="size-5" />
            {t('nav.more')}
          </button>
        </div>
      </nav>
      {/* Keeps Link prefetch semantics for the hidden items even when closed. */}
      <span hidden>
        {more.map((item) => (
          <Link key={item.key} href={`/${locale}${item.path}`} tabIndex={-1}>
            {t(`nav.${item.key}`)}
          </Link>
        ))}
      </span>
    </>
  );
}
