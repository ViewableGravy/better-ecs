import type { Plugin, ViteDevServer } from "vite";

type EngineHmrOptions = {
  sourceRoots?: readonly string[];
  distRoots?: readonly string[];
  debounceMs?: number;
  sourceAwaitDistMs?: number;
  distSettleMs?: number;
};

const DEFAULT_SOURCE_ROOTS = ["/packages/engine/src/"] as const;
const DEFAULT_DIST_ROOTS = ["/packages/engine/dist/"] as const;
const DEFAULT_DEBOUNCE_MS = 60;
const DEFAULT_SOURCE_AWAIT_DIST_MS = 4000;
const DEFAULT_DIST_SETTLE_MS = 450;

/**
 * Vite plugin that disables in-place HMR for engine source files and performs
 * a single debounced full page reload instead.
 *
 * This avoids module identity drift (e.g. component constructor references
 * changing in-place) when the client and engine live in the same dev graph.
 *
 * Usage:
 *   import { engineHmr } from '@repo/hmr';
 *   export default defineConfig({ plugins: [engineHmr()] });
 */
export function engineHmr(options: EngineHmrOptions = {}): Plugin {
  const sourceRoots = options.sourceRoots ?? DEFAULT_SOURCE_ROOTS;
  const distRoots = options.distRoots ?? DEFAULT_DIST_ROOTS;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const sourceAwaitDistMs = options.sourceAwaitDistMs ?? DEFAULT_SOURCE_AWAIT_DIST_MS;
  const distSettleMs = options.distSettleMs ?? DEFAULT_DIST_SETTLE_MS;
  let pendingFullReloadTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingSourceFallbackTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingDistSettleTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (pendingFullReloadTimeout !== null) {
      clearTimeout(pendingFullReloadTimeout);
      pendingFullReloadTimeout = null;
    }

    if (pendingSourceFallbackTimeout !== null) {
      clearTimeout(pendingSourceFallbackTimeout);
      pendingSourceFallbackTimeout = null;
    }

    if (pendingDistSettleTimeout !== null) {
      clearTimeout(pendingDistSettleTimeout);
      pendingDistSettleTimeout = null;
    }
  };

  const scheduleFullReload = (server: ViteDevServer, delayMs = debounceMs) => {
    if (pendingFullReloadTimeout !== null) {
      clearTimeout(pendingFullReloadTimeout);
    }

    pendingFullReloadTimeout = setTimeout(() => {
      server.ws.send({ type: "full-reload" });
      pendingFullReloadTimeout = null;
    }, delayMs);
  };

  const scheduleDistSettleReload = (server: ViteDevServer) => {
    if (pendingDistSettleTimeout !== null) {
      clearTimeout(pendingDistSettleTimeout);
    }

    pendingDistSettleTimeout = setTimeout(() => {
      pendingDistSettleTimeout = null;
      scheduleFullReload(server);
    }, distSettleMs);
  };

  return {
    name: "engine-hmr",
    enforce: "pre",
    apply: "serve",

    transformIndexHtml() {
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          injectTo: "head-prepend" as const,
          children: /* js */ `
globalThis.__ENGINE_HMR__ = (() => {
  const runtime = {
    systems: null,
    callbacks: null,
    register(s) { runtime.systems = s; },
    registerCallbacks(cb) { runtime.callbacks = cb; },
    onSystemCreated(fresh) {
      if (!runtime.systems) return false;
      const existing = runtime.systems[fresh.name];
      if (!existing) return false;

      if (runtime.callbacks) {
        runtime.callbacks.executeSystemCleanup(existing);
      }

      existing.system = fresh.system;
      existing.initialize = fresh.initialize;
      existing.react = undefined;
      existing.priority = fresh.priority;
      existing.enabled = fresh.enabled;

      if (runtime.callbacks) {
        runtime.callbacks.executeSystemInitialize(existing);
      }

      return true;
    },
    onSceneCreated(fresh) {
      if (!runtime.callbacks) return false;
      const isActive = runtime.callbacks.updateSceneDefinition(fresh);
      if (isActive) {
        runtime.callbacks.reloadActiveScene();
      }
      return isActive;
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

      const changedFileType = classifyEngineFile(id, sourceRoots, distRoots);
      if (changedFileType !== "other") {
        return;
      }

      const isSystemModule =
        code.includes("createSystem(") || code.includes("createRenderPipeline(");
      const isSceneModule =
        code.includes("createScene(") || code.includes("createContextScene(");

      if (!isSystemModule && !isSceneModule) {
        return;
      }

      const hotAcceptSnippet = `
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;

      return {
        code: code + hotAcceptSnippet,
        map: null,
      };
    },

    handleHotUpdate({ file, server }) {
      const changedFileType = classifyEngineFile(file, sourceRoots, distRoots);
      if (changedFileType === "other") {
        return;
      }

      if (changedFileType === "dist") {
        if (pendingSourceFallbackTimeout !== null) {
          clearTimeout(pendingSourceFallbackTimeout);
          pendingSourceFallbackTimeout = null;
        }

        scheduleDistSettleReload(server);
        return [];
      }

      if (distRoots.length === 0) {
        scheduleFullReload(server);
        return [];
      }

      if (pendingSourceFallbackTimeout !== null) {
        clearTimeout(pendingSourceFallbackTimeout);
      }

      pendingSourceFallbackTimeout = setTimeout(() => {
        pendingSourceFallbackTimeout = null;
        scheduleFullReload(server);
      }, sourceAwaitDistMs);

      return [];
    },

    closeBundle() {
      clearTimers();
    },
  };
}

function classifyEngineFile(
  path: string,
  sourceRoots: readonly string[],
  distRoots: readonly string[],
): "source" | "dist" | "other" {
  const normalizedPath = path.replace(/\\/g, "/");

  if (distRoots.some((reloadRoot) => normalizedPath.includes(reloadRoot))) {
    return "dist";
  }

  if (sourceRoots.some((reloadRoot) => normalizedPath.includes(reloadRoot))) {
    return "source";
  }

  return "other";
}
