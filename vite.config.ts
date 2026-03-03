import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: resolve(__dirname, "src/app/client"),
  plugins: [
    tsconfigPaths({
      projects: [
        resolve(__dirname, "tsconfig.base.json"),
        resolve(__dirname, "src/app/client/tsconfig.json"),
        resolve(__dirname, "src/app/server/tsconfig.json"),
        resolve(__dirname, "src/engine/tsconfig.json"),
        resolve(__dirname, "src/libs/fps/tsconfig.json"),
        resolve(__dirname, "src/libs/physics/tsconfig.json"),
        resolve(__dirname, "src/libs/spatial-contexts/tsconfig.json"),
        resolve(__dirname, "src/utils/tsconfig.json"),
        resolve(__dirname, "vite/engine-hmr/tsconfig.json"),
        resolve(__dirname, "src/engine/src/tests/type-registration/tsconfig.json"),
      ],
    }),
    tailwindcss(),
    glsl(),
  ],
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