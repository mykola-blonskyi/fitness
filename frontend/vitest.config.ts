import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: 'component',
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
    setupFiles: ['./tests/setup/component-setup.ts'],
    coverage: {
      provider: 'v8',
    },
    // No component tests exist yet - real ones land alongside each feature
    // (see plans/current.md). Async Server Components can't render under
    // RTL, so those stay covered by Playwright e2e once that lands.
    passWithNoTests: true,
  },
});
