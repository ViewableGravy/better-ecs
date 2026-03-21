import { fileURLToPath } from 'node:url';
import glsl from 'vite-plugin-glsl';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [
        fileURLToPath(new URL('../../tsconfig.base.json', import.meta.url)),
        fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
        fileURLToPath(new URL('./tsconfig.lib.json', import.meta.url)),
        fileURLToPath(new URL('./src/tests/tsconfig.json', import.meta.url)),
      ],
    }),
    glsl(),
  ],
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/tests/setup/unregister-engine.ts'],
    typecheck: {
      enabled: false,
      include: ['src/**/*.spec-d.ts', 'src/**/*.test-d.ts'],
      tsconfig: './src/tests/type-registration/tsconfig.json',
    },
  },
});
