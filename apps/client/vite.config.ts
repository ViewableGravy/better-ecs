import { engineHmr } from "@repo/hmr/plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";
import typescript from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  plugins: [tailwindcss(), engineHmr(), typescript()],
  server: {
    port: 3000,
    host: "127.0.0.1",
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
    fs: {
      // Allow serving files from workspace packages
      allow: [
        path.resolve(__dirname, "../../packages"),
        path.resolve(__dirname, "../../node_modules"),
        __dirname,
      ],
    },
    watch: {
      // Exclude heavy directories from file watching to reduce inotify pressure
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/performance-testing/**"],
    },
    allowedHosts: true,
  },
  build: {
    target: "es2022",
  },
});
