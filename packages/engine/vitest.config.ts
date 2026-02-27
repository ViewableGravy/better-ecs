import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { shadersPlugin } from './plugins/shaders';

export default defineConfig({
  plugins: [shadersPlugin()],
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
