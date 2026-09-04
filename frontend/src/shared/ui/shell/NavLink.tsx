'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { activeNavKey, type NavKey } from '@shared/ui/shell/navigation';

interface NavLinkProps {
  navKey: NavKey;
  href: string;
  className: string;
  activeClassName: string;
  children: ReactNode;
  onNavigate?: () => void;
}

export function NavLink({
  navKey,
  href,
  className,
  activeClassName,
  children,
  onNavigate,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = activeNavKey(pathname) === navKey;
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      onClick={onNavigate}
      className={`${className} ${isActive ? activeClassName : ''}`}
    >
      {children}
    </Link>
  );
}

export function useActiveNavKey(): NavKey | undefined {
  return activeNavKey(usePathname());
}
