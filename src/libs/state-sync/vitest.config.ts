import { resolve } from "node:path";
import glsl from "vite-plugin-glsl";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    glsl(),
    tsconfigPaths({
      projects: [resolve(import.meta.dirname, "../../../tsconfig.base.json")],
    }),
  ],
  test: {
    include: ["src/**/*.spec.ts"],
  },
});