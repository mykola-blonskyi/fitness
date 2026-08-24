import { cookies } from 'next/headers';
import type { MetadataRoute } from 'next';
import { hasLocale } from 'next-intl';
import { PWA_THEME_COLOR } from '@shared/constants/pwa';
import { routing } from '@/i18n/routing';

// Root layout's metadata.manifest also links to this explicitly (see
// layout.tsx) so <link rel="manifest"> is guaranteed present regardless of
// this file convention's own head-injection behavior.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // cookies() makes this route dynamic (opts out of the default static
  // caching for metadata files) - needed since start_url must match
  // whichever locale the user is actually on when they install the PWA.
  const saved = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = hasLocale(routing.locales, saved)
    ? saved
    : routing.defaultLocale;

  return {
    name: 'Fitness',
    short_name: 'Fitness',
    description:
      'Training, diet, and body-weight tracking — fitness.blonskyi.dev',
    start_url: `/${locale}`,
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: PWA_THEME_COLOR,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
