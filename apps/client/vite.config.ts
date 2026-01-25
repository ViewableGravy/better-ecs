import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  server: {
    port: 3000,
  },
  build: {
    target: 'es2022',
  },
});
