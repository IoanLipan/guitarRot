import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

/**
 * The tests that need the Firebase Emulator Suite (`*.emu.test.ts`). They are
 * not part of `vitest run`: `npm run test:cloud` starts the Auth and Firestore
 * emulators, runs this config against them and shuts them down again.
 */
export default defineConfig({
  // Never the real project from .env.local: these run against the emulators only.
  envDir: false,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.emu.test.ts'],
    // The same switch the app reads: cloud on, pointed at the emulators and the demo project.
    env: { VITE_FIREBASE_EMULATORS: '1' },
    // One emulator, so one test file at a time; each test makes its own users.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
