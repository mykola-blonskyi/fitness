import type { MetadataRoute } from 'next';
import { PWA_THEME_COLOR } from '@shared/constants/pwa';

// Special Next.js file convention — served at /manifest.webmanifest,
// statically generated at build time since nothing here depends on
// request-time data (see the file-conventions/manifest docs). Root
// layout's metadata.manifest links to it explicitly (see layout.tsx) so
// the <link rel="manifest"> tag is guaranteed present regardless of the
// file convention's own head-injection behavior.
//
// Theme/background colors and icon glyph per the ui-ux-pro-max
// "Fitness/Gym App" palette (energy orange + dark on-primary) - see
// FITNESS-12. No broader color system is adopted yet (ADR-009 keeps the
// rest of the UI on raw Tailwind zinc), this is scoped to the installed
// app's icon/splash presentation only.
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
