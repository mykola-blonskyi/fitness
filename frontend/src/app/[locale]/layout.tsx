import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

// Locale list is a placeholder until next-intl lands (FITNESS-11).
const SUPPORTED_LOCALES = ['en'];

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Fitness',
  description: 'fitness.blonskyi.dev',
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

// Kept alongside the explicit check below (not a replacement for it) -
// this protects statically-generated routes (e.g. /onboarding, /health,
// neither of which calls apiFetch/headers() on initial render) for free.
// It does NOT reliably protect genuinely dynamic routes like / and
// /diary, which call apiFetch() -> headers(), forcing dynamic (SSR)
// rendering - dynamicParams' NOT_FOUND fallback is fundamentally a
// static-generation-time concept and empirically does not apply to
// those. Confirmed live: a bot probing /wp-login.php (any single-segment
// path not otherwise routed, matching [locale]="wp-login.php") rendered
// the full page tree and crashed with a 500 instead of 404ing, despite
// this flag being set - see docs/decisions.md.
export const dynamicParams = false;

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // The real fix - works regardless of whether the matched page ends up
  // statically or dynamically rendered, unlike dynamicParams above.
  if (!SUPPORTED_LOCALES.includes(locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
