import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import {
  Geist_Mono,
  Geologica,
  IBM_Plex_Sans,
  Manrope,
  Onest,
  Source_Serif_4,
} from 'next/font/google';
import { THEME_INIT_SCRIPT } from '@shared/theme/themes';
import { ThemeBoot } from '@shared/theme/ThemeBoot';
import { ServiceWorkerRegistration } from '@shared/ui/components/ServiceWorkerRegistration';
import { PWA_THEME_COLOR } from '@shared/constants/pwa';
import { routing } from '@/i18n/routing';
import { IntlErrorBoundaryProvider } from '@/i18n/IntlErrorBoundaryProvider';
import './globals.css';

// One body/display pairing per theme (globals.css maps --font-display /
// --font-body per data-theme). All five carry Cyrillic for the uk/ru locales.
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
});
const geologica = Geologica({
  variable: '--font-geologica',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['500', '700', '800'],
});
const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  style: ['normal', 'italic'],
  weight: ['500', '600', '700'],
});
const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '500', '600'],
});
const onest = Onest({
  variable: '--font-onest',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
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
  return routing.locales.map((locale) => ({ locale }));
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
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${manrope.variable} ${geologica.variable} ${sourceSerif.variable} ${plexSans.variable} ${onest.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the stored theme before first paint; ThemeBoot re-applies
            it after hydration (see that file). Without JS the :root defaults
            (Lime Pulse) apply. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale}>
          <IntlErrorBoundaryProvider locale={locale}>
            <ThemeBoot />
            <ServiceWorkerRegistration />
            {children}
          </IntlErrorBoundaryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
