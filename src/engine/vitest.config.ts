import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [
        fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
        fileURLToPath(new URL('./tsconfig.lib.json', import.meta.url)),
      ],
    }),
  ],
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    include: ['**/*.spec.ts'],
    typecheck: {
      enabled: false,
      include: ['**/*.spec-d.ts', '**/*.test-d.ts'],
      tsconfig: './tests/type-registration/tsconfig.json',
    },
  },
});
