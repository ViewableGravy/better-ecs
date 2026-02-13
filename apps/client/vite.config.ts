import { engineHmr } from "@repo/hmr";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  plugins: [tailwindcss(), engineHmr()],
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
  resolve: {
    alias: [
      // Point workspace packages to their source for HMR in development
      // Order matters - more specific paths first
      {
        find: "@repo/engine/core",
        replacement: path.resolve(__dirname, "../../packages/engine/src/core/index.ts"),
      },
      {
        find: "@repo/engine/components",
        replacement: path.resolve(__dirname, "../../packages/engine/src/components/index.ts"),
      },
      {
        find: "@repo/engine/render",
        replacement: path.resolve(__dirname, "../../packages/engine/src/render/index.ts"),
      },
      {
        find: "@repo/engine/asset",
        replacement: path.resolve(__dirname, "../../packages/engine/src/asset/index.ts"),
      },
      {
        find: "@repo/engine/texture",
        replacement: path.resolve(__dirname, "../../packages/engine/src/texture/index.ts"),
      },
      {
        find: "@repo/engine",
        replacement: path.resolve(__dirname, "../../packages/engine/src/index.ts"),
      },
      {
        find: "@repo/hmr",
        replacement: path.resolve(__dirname, "../../packages/hmr/src/index.ts"),
      },
      {
        find: "@plugins",
        replacement: path.resolve(__dirname, "../../packages/plugins/src"),
      },
      {
        find: "@repo/plugins",
        replacement: path.resolve(__dirname, "../../packages/plugins/src/index.ts"),
      },
      {
        find: "@repo/utils",
        replacement: path.resolve(__dirname, "../../packages/utils/src/index.ts"),
      },
      {
        find: "@/assets",
        replacement: path.resolve(__dirname, "src/assets"),
      },
      {
        find: "@/components",
        replacement: path.resolve(__dirname, "src/components"),
      },
      {
        find: "@/entities",
        replacement: path.resolve(__dirname, "src/entities"),
      },
      {
        find: "@/utilities",
        replacement: path.resolve(__dirname, "src/utilities"),
      },
      {
        find: "@/systems",
        replacement: path.resolve(__dirname, "src/systems"),
      },
    ],
  },
  build: {
    target: "es2022",
  },
});
