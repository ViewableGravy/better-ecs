import { defineConfig } from 'vitest/config';
import typescript from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [typescript()],
  test: {
    include: ['src/**/*.spec.ts'],
    typecheck: {
      enabled: false,
      include: ['src/**/*.spec-d.ts', 'src/**/*.test-d.ts'],
      tsconfig: './src/tests/type-registration/tsconfig.json',
    },
  },
});
