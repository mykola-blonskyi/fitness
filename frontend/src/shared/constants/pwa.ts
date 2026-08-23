// Shared by manifest.ts and layout.tsx's viewport.themeColor so browser
// chrome and installed icon/splash never drift apart. Scoped to PWA
// presentation only — ADR-009 keeps the rest of the UI on raw Tailwind zinc.
export const PWA_THEME_COLOR = '#f97316';
