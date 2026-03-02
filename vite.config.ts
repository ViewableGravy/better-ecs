import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: resolve(__dirname, "src/app/client"),
  plugins: [tsconfigPaths(), tailwindcss(), glsl()],
  resolve: {
    alias: {
      "@client": resolve(__dirname, "src/app/client/src"),
      "@server": resolve(__dirname, "src/app/server/src"),
      "@engine": resolve(__dirname, "src/engine/src"),
      "@libs/fps": resolve(__dirname, "src/libs/fps/src"),
      "@libs/physics": resolve(__dirname, "src/libs/physics/src"),
      "@libs/spatial-contexts": resolve(__dirname, "src/libs/spatial-contexts/src"),
      "@utils": resolve(__dirname, "src/utils/src"),
    },
  },
  server: {
        fs: {
          allow: [resolve(__dirname)],
        },
    port: 3000,
    host: "127.0.0.1",
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**", "**/performance-testing/**"],
    },
    allowedHosts: true,
  },
  build: {
    target: "es2022",
    outDir: resolve(__dirname, "dist"),
  },
});