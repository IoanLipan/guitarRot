/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

// The one place the app's version lives is package.json; the Settings screen's
// About section reads it through this constant (declared in src/app-version.d.ts).
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Tests never read .env files: a developer's .env.local holds the real Firebase
  // project, and the tests expect a build with cloud off unless they say otherwise.
  envDir: mode === 'test' ? false : undefined,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Tests that talk to the Firebase emulators run on their own (`npm run test:cloud`, vitest.cloud.config.ts).
    exclude: [...configDefaults.exclude, 'src/**/*.emu.test.ts'],
    // Whole quiz runs and every-hard-song renders sit near the default 5 s
    // and time out at random on a loaded machine; a real hang still fails.
    testTimeout: 15_000,
  },
}));
