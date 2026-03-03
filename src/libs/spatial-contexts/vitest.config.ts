import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [resolve(import.meta.dirname, "../../../tsconfig.base.json")],
    }),
    glsl(),
  ],
  test: {
    include: ["src/**/*.spec.ts"],
  },
});
