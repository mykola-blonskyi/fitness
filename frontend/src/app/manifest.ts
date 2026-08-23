import type { MetadataRoute } from 'next';
import { PWA_THEME_COLOR } from '@shared/constants/pwa';

// Root layout's metadata.manifest also links to this explicitly (see
// layout.tsx) so <link rel="manifest"> is guaranteed present regardless of
// this file convention's own head-injection behavior.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fitness',
    short_name: 'Fitness',
    description:
      'Training, diet, and body-weight tracking — fitness.blonskyi.dev',
    // TODO(FITNESS-11): once next-intl routing lands, resolve this to the
    // user's detected/saved locale instead of the hardcoded "en"
    // placeholder (mirrors the same TODO in src/proxy.ts).
    start_url: '/en',
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
