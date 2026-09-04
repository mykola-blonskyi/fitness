import type { Config } from 'tailwindcss';

// Every color maps to a CSS variable from globals.css so the four themes
// (Lime Pulse, Midnight, Paper, Soft Glass) swap without touching components.
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        'line-soft': 'var(--line-soft)',
        hover: 'var(--hover)',
        track: 'var(--track)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-ink': 'var(--accent-ink)',
        'accent-strong': 'var(--accent-strong)',
        'accent-soft': 'var(--accent-soft)',
        'accent-2': 'var(--accent-2)',
        'accent-3': 'var(--accent-3)',
        inv: 'var(--inv)',
        'inv-ink': 'var(--inv-ink)',
        'hero-ink': 'var(--hero-ink)',
        'hero-muted': 'var(--hero-muted)',
        'hero-line': 'var(--hero-line)',
        'hero-accent': 'var(--hero-accent)',
        ok: 'var(--ok)',
        'ok-soft': 'var(--ok-soft)',
        warn: 'var(--warn)',
        'warn-soft': 'var(--warn-soft)',
        danger: 'var(--danger)',
        hl: 'var(--hl)',
      },
      backgroundImage: {
        hero: 'var(--hero)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-geist-mono)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-sm)',
        card: 'var(--radius)',
        ctl: 'var(--radius-sm)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      minHeight: {
        11: '2.75rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
