import { THEME_COLORS } from '@shared/theme/themes';

// Static default for the viewport meta and the manifest when no theme
// cookie is set (first visit): the Lime Pulse page background. The client
// keeps <meta name="theme-color"> in step with the active theme
// (shared/theme/apply-theme.ts) and manifest.ts reads the theme cookie.
export const PWA_THEME_COLOR = THEME_COLORS.lime;
