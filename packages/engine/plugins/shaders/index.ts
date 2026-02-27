import { resolve } from "node:path";
import type { Plugin } from "vite";
import { ShaderPlugin, type ShaderWatchEvent } from "./core";

/**
 * Creates a Vite plugin that keeps shader source files importable as GLSL strings and ensures
 * they are copied to `dist/src` with the same relative layout as `src`.
 *
 * Why this exists:
 * - Engine runtime code imports shader files directly (e.g. `./shaders/foo.vert`).
 * - TypeScript emits JS but does not emit non-TS assets, so shader files would be missing in `dist`.
 * - Client performs the final bundle, so engine output should preserve source-relative file structure.
 *
 * What this plugin does:
 * - `transform`: converts `.frag` and `.vert` imports into string modules.
 * - `buildStart`: performs a full shader sync from `src` to `dist/src`.
 * - `watchChange`: incrementally mirrors shader create/update/delete events during watch mode.
 */
export function shadersPlugin(): Plugin {
  const sourceRoot = resolve(__dirname, "../../src");
  const distRoot = resolve(__dirname, "../../dist/src");

  const shaderPlugin = new ShaderPlugin(
    sourceRoot,
    distRoot,
  )

  return {
    name: "engine:shaders",
    transform(source: string, id: string) {
      return shaderPlugin.transform(source, id);
    },
    async buildStart() {
      await shaderPlugin.buildStart();
    },
    async watchChange(id: string, change: ShaderWatchEvent) {
      await shaderPlugin.watchChange(id, change);
    },
  };
}