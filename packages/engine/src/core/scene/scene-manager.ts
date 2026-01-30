// packages/engine/src/core/scene/scene-manager.ts
import { UserWorld, World } from "../../ecs/world";
import { executeWithContext } from "../context";
import type { SceneDefinition, SceneDefinitionTuple, SceneName } from "./scene.types";

/**
 * Manages scene lifecycle, transitions, and world isolation.
 * 
 * Access via `engine.scene` to interact with scenes:
 * - `engine.scene.set("game")` - Transition to a scene
 * - `engine.scene.current` - Get the active scene name
 * - `engine.scene.world` - Get the active scene's world
 */
export class SceneManager<TScenes extends SceneDefinitionTuple = []> {
  #scenes: Map<string, SceneDefinition<string>> = new Map();
  #sceneWorlds: Map<string, World> = new Map();
  #activeScene: SceneDefinition<string> | null = null;
  #activeWorld: World;
  #userWorld: UserWorld;
  #isTransitioning: boolean = false;
  
  // Reference to engine for context execution
  #engineRef: unknown;

  constructor(scenes: SceneDefinitionTuple = []) {
    this.#activeWorld = new World("__default__");
    this.#userWorld = new UserWorld(this.#activeWorld);
    
    // Register all scenes and create their worlds
    for (const scene of scenes) {
      this.#scenes.set(scene.name, scene);
      this.#sceneWorlds.set(scene.name, new World(scene.name));
    }
  }

  /**
   * Set the engine reference for context execution.
   * @internal
   */
  setEngineRef(engine: unknown): void {
    this.#engineRef = engine;
  }

  /**
   * Get the currently active scene's world.
   */
  get world(): UserWorld {
    return this.#userWorld;
  }

  /**
   * Get the internal World instance (for engine use only).
   * @internal
   */
  get internalWorld(): World {
    return this.#activeWorld;
  }

  /**
   * Get the name of the currently active scene, or null if no scene is active.
   */
  get current(): string | null {
    return this.#activeScene?.name ?? null;
  }

  /**
   * Get the currently active scene definition, or null if no scene is active.
   */
  get definition(): SceneDefinition<string> | null {
    return this.#activeScene;
  }

  /**
   * Check if a scene transition is currently in progress.
   */
  get isTransitioning(): boolean {
    return this.#isTransitioning;
  }

  /**
   * Get all registered scene definitions as a record.
   */
  get all(): { [K in SceneName<TScenes[number]>]: SceneDefinition<K> } {
    return Object.fromEntries(this.#scenes) as any;
  }

  /**
   * Check if a scene is registered.
   */
  has(sceneName: string): boolean {
    return this.#scenes.has(sceneName);
  }

  /**
   * Transition to a new scene by name.
   * 
   * This will:
   * 1. Pause system execution
   * 2. Call teardown on the current scene (if any)
   * 3. Clear all entities from the old world
   * 4. Switch to the new scene's world
   * 5. Call setup on the new scene
   * 6. Resume system execution
   * 
   * @param sceneName - The name of the scene to transition to
   * @throws Error if scene doesn't exist or transition is already in progress
   */
  async set<TName extends SceneName<TScenes[number]>>(sceneName: TName): Promise<void> {
    // Validate scene exists
    const newScene = this.#scenes.get(sceneName as string);
    if (!newScene) {
      throw new Error(`Scene "${sceneName}" not found. Available scenes: ${[...this.#scenes.keys()].join(', ')}`);
    }

    // Don't transition if already on this scene
    if (this.#activeScene?.name === sceneName) {
      return;
    }

    // Prevent concurrent transitions
    if (this.#isTransitioning) {
      throw new Error(`Cannot transition to "${sceneName}" while another transition is in progress`);
    }

    this.#isTransitioning = true;

    try {
      // 1. Teardown current scene (if any)
      if (this.#activeScene) {
        this.#userWorld.setWorld(this.#activeWorld);
        await this.#activeScene.teardown(this.#userWorld);
      }

      // 2. Clear the old world (flush all entities)
      this.#activeWorld.clear();

      // 3. Switch to new scene's world
      const newWorld = this.#sceneWorlds.get(sceneName as string)!;
      this.#activeWorld = newWorld;
      this.#activeScene = newScene;

      // 4. Setup new scene
      this.#userWorld.setWorld(newWorld);
      await executeWithContext({ engine: this.#engineRef } as any, async () => {
        await newScene.setup(this.#userWorld);
      });

    } finally {
      this.#isTransitioning = false;
    }
  }
}
