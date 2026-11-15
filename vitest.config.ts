import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const desktopSrc = fileURLToPath(new URL('./apps/desktop/src', import.meta.url));
const sharedSrc = fileURLToPath(new URL('./packages/shared/src', import.meta.url));

export default defineConfig({
  test: {
    include: [
      'apps/desktop/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'packages/shared/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'apps/sync-server/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/graphify-out/**',
      '**/scratch/**',
      '**/.vyapara-test-identity/**',
    ],
    environment: 'node',
    alias: [
      { find: /^@(\/.*)?$/, replacement: desktopSrc + '$1' },
      { find: /^vyapara-shared(\/.*)?$/, replacement: sharedSrc + '/index.ts$1' },
    ],
  },
});
