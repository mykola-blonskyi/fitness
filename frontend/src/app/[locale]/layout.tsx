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
  // head injection - see manifest.ts.
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

// theme-color is a viewport concern, not metadata, as of Next 14+.
export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

// Kept alongside the explicit check below, not as a replacement for it:
// this only 404s statically-generated routes. Dynamic routes (/, /diary)
// force SSR via apiFetch() -> headers(), and dynamicParams' NOT_FOUND
// fallback empirically does not apply to those - confirmed live via a bot
// probing /wp-login.php, which 500'd instead of 404ing despite this flag.
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
