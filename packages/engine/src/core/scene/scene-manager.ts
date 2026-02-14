// packages/engine/src/core/scene/scene-manager.ts
import { UserWorld, World } from "../../ecs/world";
import { executeWithContext } from "../context";
import type { EngineClass } from "../register/internal";
import type { EngineSystem } from "../register/system";
import { SceneContext } from "./scene-context";
import type { SceneDefinition, SceneDefinitionTuple, SceneName } from "./scene.types";

/**
 * Manages scene lifecycle, transitions, and world isolation.
 *
 * Access via `engine.scene` to interact with scenes:
 * - `engine.scene.set("game")` - Transition to a scene
 * - `engine.scene.current` - Get the active scene name
 * - `engine.scene.world` - Get the active scene's default world
 */
export class SceneManager<TScenes extends SceneDefinitionTuple = []> {
  #scenes: Map<string, SceneDefinition<string>> = new Map();

  #activeScene: SceneDefinition<string> | null = null;
  #activeSceneContext: SceneContext | null = null;

  // Always points at the *active* world for the active scene (or the fallback world).
  // The active world is typically the scene default, but can be changed (e.g. spatial contexts).
  #activeWorld: World;
  #activeWorldId: string | null = null;
  // Stable wrapper whose internal world pointer is swapped during transitions
  #userWorld: UserWorld;

  #isTransitioning = false;

  // Reference to engine for context execution
  #engineRef: EngineClass<any, any, any> | null = null;

  #sceneSystems: Map<
    string,
    {
      all: EngineSystem[];
      update: EngineSystem[];
    }
  > = new Map();
  #initializedSceneSystems: Set<string> = new Set();

  constructor(scenes: SceneDefinitionTuple = []) {
    this.#activeWorld = new World("__default__");
    this.#userWorld = new UserWorld(this.#activeWorld);

    // Register all scenes and instantiate their scene-level systems (per engine instance)
    for (const scene of scenes) {
      this.#scenes.set(scene.name, scene);

      const instances = scene.systems.map((factory) => factory());
      const update = this.#sortSystemsForPhase(instances, "update");
      this.#sceneSystems.set(scene.name, { all: instances, update });
    }
  }

  /**
   * Set the engine reference for context execution.
   * @internal
   */
  setEngineRef(engine: EngineClass<any, any, any>): void {
    this.#engineRef = engine;
  }

  #sortSystemsForPhase(systems: EngineSystem[], phase: "update"): EngineSystem[] {
    const getPriority = (system: EngineSystem): number => {
      if (typeof system.priority === "number") return system.priority;
      return system.priority[phase] ?? 0;
    };

    return systems
      .filter((s) => [phase, "all"].includes(s.phase))
      .sort((a, b) => getPriority(b) - getPriority(a));
  }

  /** Get the currently active scene's active world (defaults to the scene default world). */
  get world(): UserWorld {
    return this.#userWorld;
  }

  /** Get the id of the currently active world for the active scene. */
  get activeWorldId(): string | null {
    return this.#activeWorldId;
  }

  /**
   * Get the internal default `World` for the active scene (or fallback).
   * @internal
   */
  get internalWorld(): World {
    return this.#activeWorld;
  }

  /**
   * Set the currently active world (affects what `engine.world` / `useWorld()` returns).
   *
   * This does not unload/load worlds; it only switches which already-loaded world is treated
   * as the active world for system execution.
   */
  setActiveWorld(id: string): void {
    const ctx = this.#activeSceneContext;
    if (!ctx) {
      throw new Error("Cannot set active world without an active scene");
    }

    const internal = ctx.getInternalWorld(id);
    if (!internal) {
      throw new Error(
        `Cannot set active world to "${id}": world is not loaded in the active scene`,
      );
    }

    this.#activeWorldId = id;
    this.#activeWorld = internal;
    this.#userWorld.setWorld(internal);
  }

  /** Get the name of the currently active scene, or null if no scene is active. */
  get current(): string | null {
    return this.#activeScene?.name ?? null;
  }

  /** Get the currently active scene definition, or null if no scene is active. */
  get definition(): SceneDefinition<string> | null {
    return this.#activeScene;
  }

  /** Get the currently active scene context, or null if no scene is active. */
  get context(): SceneContext | null {
    return this.#activeSceneContext;
  }

  /** Check if a scene transition is currently in progress. */
  get isTransitioning(): boolean {
    return this.#isTransitioning;
  }

  /** Get all registered scene definitions as a record. */
  get all(): { [Scene in TScenes[number] as SceneName<Scene>]: Scene } {
    return Object.fromEntries(this.#scenes) as any;
  }

  /** Check if a scene is registered. */
  has(sceneName: string): boolean {
    return this.#scenes.has(sceneName);
  }

  /** @internal Get scene-level systems for the active scene update loop. */
  getUpdateSystems(): EngineSystem[] {
    if (!this.#activeScene) return [];
    const entry = this.#sceneSystems.get(this.#activeScene.name);
    if (!entry) return [];
    return entry.update;
  }

  /** @internal Get a scene-level system instance by name for the active scene. */
  getActiveSystem(name: string): EngineSystem | undefined {
    if (!this.#activeScene) return undefined;
    const entry = this.#sceneSystems.get(this.#activeScene.name);
    if (!entry) return undefined;
    return entry.all.find((s) => s.name === name);
  }

  /**
   * Transition to a new scene by name.
   */
  async set<TName extends SceneName<TScenes[number]>>(sceneName: TName): Promise<void> {
    const newScene = this.#scenes.get(sceneName as string);
    if (!newScene) {
      throw new Error(
        `Scene "${sceneName}" not found. Available scenes: ${[...this.#scenes.keys()].join(", ")}`,
      );
    }

    if (this.#activeScene?.name === sceneName) return;

    if (this.#isTransitioning) {
      throw new Error(
        `Cannot transition to "${sceneName}" while another transition is in progress`,
      );
    }

    this.#isTransitioning = true;

    try {
      // Teardown previous scene
      if (this.#activeScene && this.#activeSceneContext) {
        const prevScene = this.#activeScene;
        const prevContext = this.#activeSceneContext;

        const prevDefault = prevContext.getInternalWorld(prevContext.defaultWorldId);
        if (prevDefault) {
          this.#activeWorldId = prevContext.defaultWorldId;
          this.#activeWorld = prevDefault;
          this.#userWorld.setWorld(prevDefault);
        }

        await executeWithContext({ engine: this.#engineRef, scene: prevContext }, async () => {
          await prevScene.sceneTeardown(prevContext);
          await prevScene.teardown(this.#userWorld);
        });

        prevContext.clearAllWorlds();
        this.#activeSceneContext = null;
      }

      // Create new scene context + default world
      const newWorld = new World(sceneName as string);
      const newContext = new SceneContext(newScene.name as string, newWorld);

      this.#activeScene = newScene;
      this.#activeSceneContext = newContext;
      this.#activeWorldId = newContext.defaultWorldId;
      this.#activeWorld = newWorld;
      this.#userWorld.setWorld(newWorld);

      // Setup new scene (and initialize its scene-level systems once)
      await executeWithContext({ engine: this.#engineRef, scene: newContext }, async () => {
        const systems = this.#sceneSystems.get(sceneName as string);
        if (systems && !this.#initializedSceneSystems.has(sceneName as string)) {
          for (const system of systems.all) {
            system.initialize?.();
          }
          this.#initializedSceneSystems.add(sceneName as string);
        }

        await newScene.sceneSetup(newContext);
        await newScene.setup(this.#userWorld);
      });
    } finally {
      this.#isTransitioning = false;
    }
  }
}
