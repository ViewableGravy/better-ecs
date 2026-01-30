import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: __dirname,
  plugins: [tailwindcss()],
  server: {
    port: 3000,
  },
  build: {
    target: 'es2022',
  },
});
