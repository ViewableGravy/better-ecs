import { engineHmr } from "@repo/hmr";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: __dirname,
  plugins: [tsconfigPaths(), tailwindcss(), engineHmr()],
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
        resolve(__dirname, "../../packages"),
        resolve(__dirname, "../../node_modules"),
        __dirname,
      ],
    },
    watch: {
      // Exclude heavy directories from file watching to reduce inotify pressure
      ignored: ["**/node_modules/**", "**/.git/**", "**/performance-testing/**"],
    },
    allowedHosts: true,
  },
  build: {
    target: "es2022",
  },
});
