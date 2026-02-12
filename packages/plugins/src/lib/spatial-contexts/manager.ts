import type { SceneContext, UserWorld } from "@repo/engine";
import type { ContextId } from "./context-id";
import type { ContextDefinition } from "./definition";
import { deriveSetsFromPolicy } from "./derive";
import { mergePolicy } from "./policy";
import { computeContextStack } from "./stack";

export class SpatialContextManager {
  readonly #scene: SceneContext;
  readonly #definitions = new Map<ContextId, ContextDefinition>();
  readonly #setupCompleted = new Set<ContextId>();

  #focusedId: ContextId;

  constructor(scene: SceneContext) {
    this.#scene = scene;
    // The engine guarantees a default world exists; treat it as the root context.
    this.#focusedId = scene.defaultWorldId as ContextId;
  }

  getRootContextId(): ContextId {
    return this.#scene.defaultWorldId as ContextId;
  }

  registerDefinition(def: ContextDefinition): void {
    // Validate parent chain incrementally (cycle detection) by attempting to compute a stack.
    this.#definitions.set(def.id, def);

    // Only validate if the definition participates in parent chains.
    const parentResolver = (id: ContextId): ContextId | undefined =>
      this.#definitions.get(id)?.parentId;
    computeContextStack(def.id, parentResolver);
  }

  unregisterDefinition(id: ContextId): void {
    this.#definitions.delete(id);
  }

  listDefinitions(): readonly ContextDefinition[] {
    return [...this.#definitions.values()];
  }

  getFocusedContextId(): ContextId {
    return this.#focusedId;
  }

  setFocusedContextId(id: ContextId): void {
    this.ensureWorldLoaded(id);
    this.#focusedId = id;
  }

  getWorld(id: ContextId): UserWorld | undefined {
    if (id === (this.#scene.defaultWorldId as ContextId)) {
      return this.#scene.getDefaultWorld();
    }

    return this.#scene.getWorld(id);
  }

  getWorldOrThrow(id: ContextId): UserWorld {
    const world = this.getWorld(id);
    if (!world) {
      throw new Error(`World for context "${id}" is not loaded`);
    }
    return world;
  }

  ensureWorldLoaded(id: ContextId): UserWorld {
    const existing = this.getWorld(id);
    if (existing) {
      const def = this.#definitions.get(id);
      if (def?.setup && !this.#setupCompleted.has(id)) {
        this.#setupCompleted.add(id);
        def.setup(existing);
      }

      return existing;
    }

    const world = this.#scene.loadAdditionalWorld(id);

    const def = this.#definitions.get(id);
    if (def?.setup && !this.#setupCompleted.has(id)) {
      this.#setupCompleted.add(id);
      def.setup(world);
    }

    return world;
  }

  unloadWorld(id: ContextId): void {
    if (id === this.#focusedId) {
      throw new Error(`Cannot unload focused context "${id}"`);
    }

    if (id === (this.#scene.defaultWorldId as ContextId)) {
      throw new Error("Cannot unload root/default context world");
    }

    if (!this.#scene.hasWorld(id)) return;
    this.#scene.unloadWorld(id);
  }

  getContextStack(): readonly ContextId[] {
    const parentResolver = (id: ContextId): ContextId | undefined => {
      // Root has no parent.
      if (id === (this.#scene.defaultWorldId as ContextId)) return undefined;
      return this.#definitions.get(id)?.parentId;
    };

    return computeContextStack(this.#focusedId, parentResolver).stack;
  }

  getVisibleContextIds(): readonly ContextId[] {
    const stack = this.getContextStack();
    const focusedDef = this.#definitions.get(this.#focusedId);
    const policy = mergePolicy(focusedDef?.policy);
    return deriveSetsFromPolicy(stack, policy).visible;
  }

  getSimulatedContextIds(): readonly ContextId[] {
    const stack = this.getContextStack();
    const focusedDef = this.#definitions.get(this.#focusedId);
    const policy = mergePolicy(focusedDef?.policy);
    return deriveSetsFromPolicy(stack, policy).simulated;
  }

  getVisibleWorlds(): readonly UserWorld[] {
    return this.getVisibleContextIds().map((id) => this.getWorldOrThrow(id));
  }

  getSimulatedWorlds(): readonly UserWorld[] {
    return this.getSimulatedContextIds().map((id) => this.getWorldOrThrow(id));
  }
}
