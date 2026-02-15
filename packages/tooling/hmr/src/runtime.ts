/**
 * Engine HMR Runtime
 *
 * A lightweight bridge between the ECS engine and Vite's HMR system.
 * The runtime is initialized inline in the HTML (via the Vite plugin's
 * `transformIndexHtml`) so it exists before any application modules load.
 *
 * How it works:
 *   1. The inline script creates `globalThis.__ENGINE_HMR__` with:
 *      - `register(systems)`: stores a reference to the live systems record
 *      - `onSystemCreated(fresh)`: hot-swaps a system's behaviour in-place
 *   2. `createEngine` calls `register(systemsRecord)` on startup.
 *   3. When a system module is HMR'd, `createSystem` calls
 *      `onSystemCreated(fresh)` — the runtime finds the existing system
 *      by name and swaps its behaviour while preserving its state/data.
 */

const HMR_KEY = "__ENGINE_HMR__";

export type EngineSystem = {
  name: string;
  data: unknown;
  schema: unknown;
  priority: unknown;
  enabled: boolean;
  system: () => void;
  initialize?: () => void | (() => void);

  /**
   * An automatically appended "dispose" function which is assigned the return
   * of `initialize()` if it returns a function. this is used for hot reloading
   * and is called before swapping in a new system implementation, allowing the old system to clean up any side effects (e.g. event listeners, intervals) before the new
   * implementation takes over.
   */
  react?: () => void;
};

export type HMRCallbacks = {
  executeSystemCleanup: (system: EngineSystem) => void;
  executeSystemInitialize: (system: EngineSystem) => void;
  reloadActiveScene: () => Promise<void>;
  updateSceneDefinition: (scene: Record<string, unknown>) => boolean;
};

export type HMRRuntime = {
  systems: Record<string, EngineSystem> | null;
  callbacks: HMRCallbacks | null;
  register(systems: Record<string, EngineSystem>): void;
  registerCallbacks(callbacks: HMRCallbacks): void;
  onSystemCreated(fresh: EngineSystem): boolean;
  onSceneCreated(fresh: Record<string, unknown>): boolean;
};

/**
 * Returns the singleton HMR runtime from globalThis.
 * In dev mode, the Vite plugin ensures this is initialized before any
 * application code runs. Returns `null` if the runtime doesn't exist
 * (e.g. in production or outside a Vite dev server).
 */
export function getRuntime(): HMRRuntime | null {
  return ((globalThis as Record<string, unknown>)[HMR_KEY] as HMRRuntime) ?? null;
}
