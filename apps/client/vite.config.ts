import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [tailwindcss()],
  server: {
    port: 3000,
    fs: {
      // Allow serving files from workspace packages
      allow: [
        path.resolve(__dirname, '../../packages'),
        path.resolve(__dirname, '../../node_modules'),
        __dirname,
      ],
    },
  },
  resolve: {
    alias: [
      // Point workspace packages to their source for HMR in development
      // Order matters - more specific paths first
      { find: '@repo/engine/core', replacement: path.resolve(__dirname, '../../packages/engine/src/core/index.ts') },
      { find: '@repo/engine/components', replacement: path.resolve(__dirname, '../../packages/engine/src/components/index.ts') },
      { find: '@repo/engine/render', replacement: path.resolve(__dirname, '../../packages/engine/src/render/index.ts') },
      { find: '@repo/engine', replacement: path.resolve(__dirname, '../../packages/engine/src/index.ts') },
      { find: '@repo/plugins', replacement: path.resolve(__dirname, '../../packages/plugins/src/index.ts') },
      { find: '@repo/utils', replacement: path.resolve(__dirname, '../../packages/utils/src/index.ts') },
    ],
  },
  build: {
    target: 'es2022',
  },
});
