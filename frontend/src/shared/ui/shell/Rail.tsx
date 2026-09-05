import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { NAV_GROUPS } from '@shared/ui/shell/navigation';
import { NavLink } from '@shared/ui/shell/NavLink';

// Desktop navigation: full rail from lg, icon-only rail from md, hidden
// below md where MobileTabs takes over.
export function Rail({
  locale,
  isAdmin,
}: {
  locale: string;
  isAdmin: boolean;
}) {
  const t = useTranslations('Header');

  return (
    <aside className="rail sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col gap-5 border-r border-line-soft bg-bg px-2.5 py-5 md:flex lg:w-[208px] lg:px-3">
      <Link
        href={`/${locale}`}
        className="flex items-center justify-center gap-2.5 font-display text-[15px] font-extrabold lg:justify-start lg:px-2"
      >
        <span className="flex size-8 items-center justify-center rounded-ctl bg-accent text-base text-accent-ink">
          F
        </span>
        <span className="hidden lg:inline">{t('brand')}</span>
      </Link>

      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.key} className="flex flex-col gap-0.5">
            <span className="kicker hidden px-2 py-1.5 lg:block">
              {t(`groups.${group.key}`)}
            </span>
            {items.map((item) => (
              <NavLink
                key={item.key}
                navKey={item.key}
                href={`/${locale}${item.path}`}
                className="flex min-h-10 items-center justify-center gap-2.5 rounded-ctl px-2 text-sm font-medium text-ink transition-colors hover:bg-hover lg:justify-start"
                activeClassName="!bg-inv !text-inv-ink"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="hidden lg:inline">{t(`nav.${item.key}`)}</span>
              </NavLink>
            ))}
          </div>
        );
      })}

      <a
        href={`${process.env.HUB_URL}/${locale}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto hidden items-center justify-between rounded-ctl border border-line bg-surface px-2.5 py-2 text-xs text-muted transition-colors hover:text-ink lg:flex"
      >
        {t('hub')}
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold">
          ↗
        </span>
      </a>
    </aside>
  );
}
