import { getContextEngine } from "../core/context";
import type {
  AllSceneNames,
  RegisteredAssetManager,
  RegisteredEngine,
  RegisteredSystems,
  SystemNames,
} from "../core/engine-types";
import type { SceneContext } from "../core/scene/scene-context";
import type { EngineSystem } from "../core/system";
import type { UserWorld } from "../ecs/world";
import { mouseApi, type Mouse as MouseInterface } from "../systems/input/mouse";

/***** TYPE DEFINITIONS *****/
export type EngineContextOptions<T> = {
  select: (engine: RegisteredEngine) => T;
};

/***** CORE FUNCTION *****/

/**
 * Retrieves a value from the current engine execution context.
 * Must be called during system execution (update or render phase).
 *
 * @example
 * ```ts
 * const engine = fromContext(Engine);
 * const world = fromContext(World);
 * const input = fromContext(System("engine:input"));
 * const [updateDelta] = fromContext(Delta);
 * ```
 */
export function fromContext<T>(options: EngineContextOptions<T>): T {
  return options.select(getContextEngine());
}

/***** SINGLETON OPTIONS *****/

/** Context option that returns the current registered engine instance. */
export const Engine: EngineContextOptions<RegisteredEngine> = {
  select: (engine) => engine,
};

/** Context option that returns `[updateDelta, frameDelta, updateProgress]` timing values. */
export const Delta: EngineContextOptions<
  [updateDelta: number, frameDelta: number, updateProgress: number]
> = {
  select: (engine) => [engine.meta.updateDelta, engine.meta.frameDelta, engine.meta.updateProgress],
};

/** Context option that returns the current active world. */
export const World: EngineContextOptions<UserWorld> = {
  select: (engine) => engine.world,
};

/** Context option that returns the current active scene context. */
export const Scene: EngineContextOptions<SceneContext> = {
  // engine.scene is SceneManager which always has an active context
  select: (engine) => engine.scene.context,
};

/** Context option that returns the registered asset manager. */
export const Assets: EngineContextOptions<RegisteredAssetManager> = {
  select: (engine) => engine.assets,
};

/** Context option that returns a function to transition to a scene by name. */
export const SetScene: EngineContextOptions<
  <TName extends AllSceneNames>(sceneName: TName) => Promise<void>
> = {
  select: (engine) => (sceneName) => (engine as any).scene.set(sceneName),
};

/** Context option that returns the mouse API for reading pointer positions. */
export const Mouse: EngineContextOptions<MouseInterface> = {
  select: () => mouseApi,
};

/***** FACTORY FUNCTIONS *****/

type RegisteredSystemNames = Extract<SystemNames, keyof RegisteredSystems>;

const systemCache = new Map<string, EngineContextOptions<RegisteredSystems[RegisteredSystemNames]>>();

/**
 * Creates a context option that returns a system by name with automatic type inference.
 * The returned options object is cached per name to avoid per-frame allocations.
 *
 * @example
 * ```ts
 * const input = fromContext(System("engine:input"));
 * ```
 */
export function System<TSystem extends RegisteredSystemNames>(
  name: TSystem,
): EngineContextOptions<RegisteredSystems[TSystem]> {
  const cached = systemCache.get(name);
  if (cached) return cached as EngineContextOptions<RegisteredSystems[TSystem]>;

  const opts: EngineContextOptions<RegisteredSystems[TSystem]> = {
    select: (engine) => engine.systems[name],
  };
  systemCache.set(name, opts as EngineContextOptions<RegisteredSystems[RegisteredSystemNames]>);
  return opts;
}

/**
 * Creates a context option that returns a system with an explicit type override.
 * For use in plugins that don't have access to the global Register interface.
 *
 * @example
 * ```ts
 * const { data } = fromContext(OverrideSystem<EngineSystem<typeof schema>>("plugin:fps-counter"));
 * ```
 */
export function OverrideSystem<TOverride extends EngineSystem>(
  system: string,
): EngineContextOptions<TOverride> {
  return {
    select: (engine) => (engine.systems as any)[system] as TOverride,
  };
}
