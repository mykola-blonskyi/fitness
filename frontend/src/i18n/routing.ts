import { defineRouting } from 'next-intl/routing';

// Deliberately not shared/types/user's LOCALES (the stored profile
// preference used for catalog-translation resolution, per
// knowledge/business-rules.md "Catalog display names resolve against the
// user's stored locale, not the route") - same four values, different
// concern, kept independent on purpose.
export const routing = defineRouting({
  locales: ['en', 'uk', 'ru', 'es'],
  defaultLocale: 'en',
  // next-intl defaults NEXT_LOCALE to a session cookie (no max-age) - too
  // short-lived for the "persists across sessions" AC (FITNESS-11).
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
  },
});
