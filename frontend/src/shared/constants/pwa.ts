// Single source of truth for the installed-app accent color (FITNESS-12)
// - shared between app/manifest.ts's theme_color and
// [locale]/layout.tsx's viewport.themeColor so the browser chrome and
// the installed app icon/splash never drift out of sync with each
// other. Picked via the ui-ux-pro-max "Fitness/Gym App" palette (energy
// orange). No broader color system exists yet (ADR-009 keeps the rest
// of the UI on raw Tailwind zinc) - this is scoped to PWA
// icon/splash/chrome presentation only.
export const PWA_THEME_COLOR = '#f97316';
