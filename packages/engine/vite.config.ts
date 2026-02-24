import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    typecheck: {
      enabled: false,
      include: ['src/**/*.spec-d.ts', 'src/**/*.test-d.ts'],
      tsconfig: './src/tests/type-registration/tsconfig.json',
    },
  },
});
