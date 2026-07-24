import { Parent, Transform2D, WorldTransform2D } from "@engine/components";
import type { TransformState2D } from "@engine/components/transform";
import type { EntityId } from "@engine/ecs/entity";
import type {
  ComponentMutationKind,
  Registry,
  RegistryMutationObserver,
} from "@engine/ecs/registry";

export type Transform2DRegistryState = {
  readonly dirtyEntityIds: EntityId[];
  readonly localNeedsSnapshot: Transform2D[];
  readonly worldNeedsSnapshot: WorldTransform2D[];
  initialized: boolean;
};

/**
 * Converts explicit ECS component publications into batched transform work.
 * Field writes are intentionally invisible until their owning component is patched.
 */
export class Transform2DTracker implements RegistryMutationObserver {
  readonly #states = new WeakMap<Registry, Transform2DRegistryState>();

  getState(registry: Registry): Transform2DRegistryState {
    const existing = this.#states.get(registry);
    if (existing) {
      this.#initialize(registry, existing);
      return existing;
    }

    const created: Transform2DRegistryState = {
      dirtyEntityIds: [],
      localNeedsSnapshot: [],
      worldNeedsSnapshot: [],
      initialized: false,
    };
    this.#states.set(registry, created);
    registry.observeMutations(this);
    this.#initialize(registry, created);
    return created;
  }

  componentChanged(
    registry: Registry,
    entityId: EntityId,
    componentType: Function,
    kind: ComponentMutationKind,
    component: unknown,
  ): void {
    const state = this.#states.get(registry);
    if (!state) {
      return;
    }

    if (componentType === Transform2D) {
      state.dirtyEntityIds.push(entityId);
      if (kind === "patched" && component instanceof Transform2D) {
        state.localNeedsSnapshot.push(component);
      }
      return;
    }

    if (componentType === Parent) {
      state.dirtyEntityIds.push(entityId);
    }
  }

  registryReset(registry: Registry): void {
    const state = this.#states.get(registry);
    if (!state) {
      return;
    }

    state.dirtyEntityIds.length = 0;
    state.localNeedsSnapshot.length = 0;
    state.worldNeedsSnapshot.length = 0;
    state.initialized = false;
  }

  snapshot(registry: Registry): void {
    const state = this.getState(registry);

    for (const transform of state.localNeedsSnapshot) {
      transform.prev.copyFrom(transform.curr);
    }
    state.localNeedsSnapshot.length = 0;

    for (const transform of state.worldNeedsSnapshot) {
      if (transformStatesMatch(transform.prev, transform.curr)) {
        continue;
      }

      transform.prev.copyFrom(transform.curr);
      const entityId = transform.attachedEntityId;
      // A queued derived transform can be detached before the next snapshot when its entity is removed.
      if (entityId !== null && entityId !== undefined) {
        registry.notifyEntityChanged(entityId);
      }
    }
    state.worldNeedsSnapshot.length = 0;
  }

  markWorldNeedsSnapshot(registry: Registry, transform: WorldTransform2D): void {
    this.getState(registry).worldNeedsSnapshot.push(transform);
  }

  #initialize(registry: Registry, state: Transform2DRegistryState): void {
    if (state.initialized) {
      return;
    }

    registry.forEach(Transform2D, (entityId) => state.dirtyEntityIds.push(entityId));
    registry.forEach(WorldTransform2D, (entityId, transform) => {
      state.dirtyEntityIds.push(entityId);
      if (!transformStatesMatch(transform.prev, transform.curr)) {
        state.worldNeedsSnapshot.push(transform);
      }
    });
    state.initialized = true;
  }
}

export const transform2DTracker = new Transform2DTracker();

function transformStatesMatch(left: TransformState2D, right: TransformState2D): boolean {
  return left.pos.x === right.pos.x
    && left.pos.y === right.pos.y
    && left.rotation === right.rotation
    && left.scale.x === right.scale.x
    && left.scale.y === right.scale.y;
}
