import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { shadersPlugin } from './plugins/shaders';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [
        fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
        fileURLToPath(new URL('./tsconfig.lib.json', import.meta.url)),
      ],
    }),
    shadersPlugin(),
  ],
  resolve: {
    alias: {
      '@assets': fileURLToPath(new URL('./src/asset', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@context': fileURLToPath(new URL('./src/context', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@ecs': fileURLToPath(new URL('./src/ecs', import.meta.url)),
      '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
      '@tests': fileURLToPath(new URL('./src/tests', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
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
