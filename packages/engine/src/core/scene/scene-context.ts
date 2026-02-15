import { UserWorld, World } from "../../ecs/world";

const DEFAULT_WORLD_ID = "default" as const;

/**
 * Runtime scene context available during system execution via `useScene()`.
 *
 * A scene owns one or more worlds. The engine guarantees a default world exists.
 */
export class SceneContext<TName extends string = string> {
  readonly name: TName;

  readonly #defaultWorldId: string;
  readonly #worlds = new Map<string, World>();
  readonly #userWorlds = new Map<string, UserWorld>();

  constructor(name: TName, defaultWorld: World, defaultWorldId: string = DEFAULT_WORLD_ID) {
    this.name = name;
    this.#defaultWorldId = defaultWorldId;

    this.#worlds.set(this.#defaultWorldId, defaultWorld);
    this.#userWorlds.set(this.#defaultWorldId, new UserWorld(defaultWorld));
  }

  /** Returns the id of the default world. */
  get defaultWorldId(): string {
    return this.#defaultWorldId;
  }

  /** Returns the default world (always present). */
  getDefaultWorld(): UserWorld {
    const world = this.#userWorlds.get(this.#defaultWorldId);
    if (!world) {
      // Should be impossible unless internal invariants are violated.
      throw new Error("SceneContext invariant violated: default world wrapper missing");
    }
    return world;
  }

  /** Returns a world by id, if loaded. */
  getWorld(id: string): UserWorld | undefined {
    return this.#userWorlds.get(id);
  }

  /** Returns the internal `World` by id for engine / low-level callers. */
  getInternalWorld(id: string): World | undefined {
    return this.#worlds.get(id);
  }

  /** Returns all loaded worlds for this scene. */
  get worlds() {
    return this.#userWorlds.values();
  }

  /** Returns whether a world id is currently loaded. */
  hasWorld(id: string): boolean {
    return this.#worlds.has(id);
  }

  /**
   * Register a world under an id.
   *
   * If a world is already registered for the id, it will be replaced.
   */
  registerWorld(id: string, world: World): UserWorld {
    this.#worlds.set(id, world);

    const wrapper = this.#userWorlds.get(id);
    if (wrapper) {
      wrapper.setWorld(world);
      return wrapper;
    }

    const newWrapper = new UserWorld(world);
    this.#userWorlds.set(id, newWrapper);
    return newWrapper;
  }

  /**
   * Create and register an additional world.
   *
   * The created world is returned as a `UserWorld` wrapper.
   */
  loadAdditionalWorld(id: string): UserWorld {
    if (id === this.#defaultWorldId) {
      throw new Error(`Cannot load additional world with reserved id "${this.#defaultWorldId}"`);
    }

    const internal = new World(`${this.name}:${id}`);
    return this.registerWorld(id, internal);
  }

  /**
   * Unregister a non-default world.
   */
  unloadWorld(id: string): void {
    this.unregisterWorld(id);
  }

  /**
   * Unregister a non-default world.
   */
  unregisterWorld(id: string): void {
    if (id === this.#defaultWorldId) {
      throw new Error("Cannot unregister default world");
    }

    this.#worlds.delete(id);
    this.#userWorlds.delete(id);
  }

  /**
   * Clear all worlds and unregister non-default worlds.
   * @internal
   */
  clearAllWorlds(): void {
    // Clear + drop non-default worlds
    for (const [id, world] of this.#worlds) {
      world.clear();

      if (id !== this.#defaultWorldId) {
        this.#worlds.delete(id);
        this.#userWorlds.delete(id);
      }
    }
  }
}
