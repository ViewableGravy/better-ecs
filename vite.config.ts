import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  root: resolve(__dirname, "src/app/client"),
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    glsl(),
  ],
  resolve: {
    tsconfigPaths: true, // Enable built-in tsconfig paths support
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