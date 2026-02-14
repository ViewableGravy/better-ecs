import type { Plugin } from "vite";

/**
 * Vite plugin that enables Hot Module Replacement for ECS systems.
 *
 * Any module that uses `createSystem` or `createRenderPipeline` becomes an
 * HMR boundary. When you save that file (or any of its dependencies), only
 * the changed system's behaviour is swapped — its state is preserved and all
 * other systems continue running untouched.
 *
 * How it works:
 *   1. An inline script in the HTML initializes the HMR runtime on
 *      `globalThis.__ENGINE_HMR__` before any application code loads.
 *   2. `createEngine` calls `runtime.register(systems)` so the runtime
 *      has a live reference to the systems record.
 *   3. Each system module gets `import.meta.hot.accept()` injected,
 *      making it a self-accepting HMR boundary.
 *   4. On HMR update, the module re-executes `createSystem(name)(opts)`.
 *      `createSystem` calls `runtime.onSystemCreated(fresh)` which swaps
 *      the live system's behaviour while keeping its state/data intact.
 *
 * Usage:
 *   import { engineHmr } from '@repo/hmr';
 *   export default defineConfig({ plugins: [engineHmr()] });
 */
export function engineHmr(): Plugin {
  return {
    name: "engine-hmr",
    apply: "serve",

    transformIndexHtml() {
      // Inject the HMR runtime initialization before any app modules load.
      // This ensures `globalThis.__ENGINE_HMR__` exists when `createEngine`
      // calls `register()` on first load.
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          injectTo: "head-prepend" as const,
          children: /* js */ `
globalThis.__ENGINE_HMR__ = (() => {
  const runtime = {
    systems: null,
    register(s) { runtime.systems = s; },
    onSystemCreated(fresh) {
      if (!runtime.systems) return false;
      const existing = runtime.systems[fresh.name];
      if (!existing) return false;
      existing.system = fresh.system;
      existing.initialize = fresh.initialize;
      existing.priority = fresh.priority;
      existing.enabled = fresh.enabled;
      return true;
    },
  };
  return runtime;
})();
`,
        },
      ];
    },

    transform(code, id) {
      if (!/\.[tj]sx?$/.test(id)) return;
      if (id.includes("node_modules")) return;

      const isSystemModule =
        code.includes("createSystem(") || code.includes("createRenderPipeline(");

      if (!isSystemModule) return;

      // Make this module an HMR boundary. When it (or any dependency)
      // changes, Vite re-executes just this module. The engine's
      // createSystem detects the HMR runtime and hot-swaps the system
      // behaviour while keeping state intact.
      const hmrSnippet = `
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;
      return { code: code + hmrSnippet, map: null };
    },
  };
}
