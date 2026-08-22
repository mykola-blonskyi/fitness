import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import { ServiceWorkerRegistration } from '@shared/ui/components/ServiceWorkerRegistration';
import { PWA_THEME_COLOR } from '@shared/constants/pwa';
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
  // Explicit link, in addition to app/manifest.ts's own file-convention
  // head injection - see manifest.ts's comment (FITNESS-12).
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

// theme-color is a viewport concern, not metadata, as of Next 14+ - see
// the generateViewport docs (FITNESS-12: shares PWA_THEME_COLOR with
// manifest.ts's theme_color so the browser chrome/status bar and the
// installed app icon can't drift out of sync).
export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
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
      <body className="flex min-h-full flex-col">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
