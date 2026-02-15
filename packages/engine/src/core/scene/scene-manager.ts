// packages/engine/src/core/scene/scene-manager.ts
import { UserWorld, World } from "../../ecs/world";
import { executeWithContext } from "../context";
import type { EngineClass } from "../register/internal";
import type { EngineSystem } from "../register/system";
import { executeSystemCleanup, executeSystemInitialize } from "../register/system";
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
  static readonly DEFAULT_SCENE_NAME = "__default__" as const;

  #scenes: Map<string, SceneDefinition<string>> = new Map();

  #activeScene: SceneDefinition<string> | null = null;
  #activeSceneContext: SceneContext;

  // Always points at the *active* world for the active scene (or the fallback world).
  // The active world is typically the scene default, but can be changed (e.g. spatial contexts).
  #activeWorld: World;
  #activeWorldId: string;
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
    this.#activeSceneContext = new SceneContext(SceneManager.DEFAULT_SCENE_NAME, this.#activeWorld);
    this.#activeWorldId = this.#activeSceneContext.defaultWorldId;

    // Register all scenes and instantiate their scene-level systems (per engine instance)
    for (const scene of scenes) {
      this.#scenes.set(scene.name, scene);

      const instances = scene.systems.map((factory) => factory());
      const update = this.#sortSystemsForPhase(instances);
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

  #sortSystemsForPhase(systems: EngineSystem[]): EngineSystem[] {
    const getPriority = (system: EngineSystem): number => system.priority;

    return systems.sort((a, b) => getPriority(b) - getPriority(a));
  }

  /** Get the currently active scene's active world (defaults to the scene default world). */
  get world(): UserWorld {
    return this.#userWorld;
  }

  /** Get the id of the currently active world for the active scene context. */
  get activeWorldId(): string {
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
    const internal = this.#activeSceneContext.getInternalWorld(id);
    if (!internal) {
      throw new Error(
        `Cannot set active world to "${id}": world is not loaded in the active scene`,
      );
    }

    this.#activeWorldId = id;
    this.#activeWorld = internal;
    this.#userWorld.setWorld(internal);
  }

  /** Get the name of the currently active scene context. */
  get current(): string {
    return this.#activeScene?.name ?? this.#activeSceneContext.name;
  }

  /** Get the currently active scene definition, or null if no scene is active. */
  get definition(): SceneDefinition<string> | null {
    return this.#activeScene;
  }

  /** Get the currently active scene context. */
  get context(): SceneContext {
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
      if (this.#activeScene) {
        await this.#teardownActiveScene();
      }

      await this.#setupScene(newScene);
    } finally {
      this.#isTransitioning = false;
    }
  }

  /**
   * Reload the currently active scene by tearing it down and setting it up again.
   * Used by HMR when a scene definition is updated.
   * @internal
   */
  async reload(): Promise<void> {
    if (!this.#activeScene) return;
    if (this.#isTransitioning) return;

    this.#isTransitioning = true;

    try {
      const sceneToReload = this.#activeScene;
      await this.#teardownActiveScene();
      await this.#setupScene(sceneToReload);
    } finally {
      this.#isTransitioning = false;
    }
  }

  /**
   * Update a registered scene definition in-place (for HMR).
   * Returns true if the updated scene is the currently active scene.
   * @internal
   */
  updateDefinition(fresh: SceneDefinition<string>): boolean {
    const existing = this.#scenes.get(fresh.name);
    if (!existing) return false;

    existing.setup = fresh.setup;
    existing.teardown = fresh.teardown;
    existing.sceneSetup = fresh.sceneSetup;
    existing.sceneTeardown = fresh.sceneTeardown;

    return this.#activeScene?.name === fresh.name;
  }

  /**
   * Get all scene-level system instances across all scenes.
   * Used by HMR to register scene systems for hot-swapping.
   * @internal
   */
  getAllSceneSystems(): EngineSystem[] {
    const all: EngineSystem[] = [];
    for (const entry of this.#sceneSystems.values()) {
      all.push(...entry.all);
    }
    return all;
  }

  async #teardownActiveScene(): Promise<void> {
    const prevScene = this.#activeScene;
    const prevContext = this.#activeSceneContext;

    if (!prevScene) return;

    const systems = this.#sceneSystems.get(prevScene.name);

    const prevDefault = prevContext.getInternalWorld(prevContext.defaultWorldId);
    if (prevDefault) {
      this.#activeWorldId = prevContext.defaultWorldId;
      this.#activeWorld = prevDefault;
      this.#userWorld.setWorld(prevDefault);
    }

    await executeWithContext({ engine: this.#engineRef, scene: prevContext }, async () => {
      // Cleanup scene-level systems before teardown
      if (systems) {
        for (const system of systems.all) {
          executeSystemCleanup(system);
        }
      }

      await prevScene.sceneTeardown(prevContext);
      await prevScene.teardown(this.#userWorld);
    });

    if (systems) {
      this.#initializedSceneSystems.delete(prevScene.name);
    }

    prevContext.clearAllWorlds();
    this.#activeScene = null;
  }

  async #setupScene(scene: SceneDefinition<string>): Promise<void> {
    const newWorld = new World(scene.name);
    const newContext = new SceneContext(scene.name, newWorld);

    this.#activeScene = scene;
    this.#activeSceneContext = newContext;
    this.#activeWorldId = newContext.defaultWorldId;
    this.#activeWorld = newWorld;
    this.#userWorld.setWorld(newWorld);

    await executeWithContext({ engine: this.#engineRef, scene: newContext }, async () => {
      const systems = this.#sceneSystems.get(scene.name);
      if (systems && !this.#initializedSceneSystems.has(scene.name)) {
        for (const system of systems.all) {
          executeSystemInitialize(system);
        }
        this.#initializedSceneSystems.add(scene.name);
      }

      await scene.sceneSetup(newContext);
      await scene.setup(this.#userWorld);
    });
  }
}
