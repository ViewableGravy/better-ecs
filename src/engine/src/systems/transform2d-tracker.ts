import { Parent, Transform2D, WorldTransform2D } from "@engine/components";
import type { TransformState2D } from "@engine/components/transform";
import type { EntityId } from "@engine/ecs/entity";
import type {
  ComponentMutationKind,
  UserWorld,
  WorldMutationObserver,
} from "@engine/ecs/world";

export type Transform2DWorldState = {
  readonly dirtyEntityIds: EntityId[];
  readonly localNeedsSnapshot: Transform2D[];
  readonly worldNeedsSnapshot: WorldTransform2D[];
  initialized: boolean;
};

/**
 * Converts explicit ECS component publications into batched transform work.
 * Field writes are intentionally invisible until their owning component is patched.
 */
export class Transform2DTracker implements WorldMutationObserver {
  readonly #states = new WeakMap<UserWorld, Transform2DWorldState>();

  getState(world: UserWorld): Transform2DWorldState {
    const existing = this.#states.get(world);
    if (existing) {
      this.#initialize(world, existing);
      return existing;
    }

    const created: Transform2DWorldState = {
      dirtyEntityIds: [],
      localNeedsSnapshot: [],
      worldNeedsSnapshot: [],
      initialized: false,
    };
    this.#states.set(world, created);
    world.observeMutations(this);
    this.#initialize(world, created);
    return created;
  }

  componentChanged(
    world: UserWorld,
    entityId: EntityId,
    componentType: Function,
    kind: ComponentMutationKind,
    component: unknown,
  ): void {
    const state = this.#states.get(world);
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

  worldReset(world: UserWorld): void {
    const state = this.#states.get(world);
    if (!state) {
      return;
    }

    state.dirtyEntityIds.length = 0;
    state.localNeedsSnapshot.length = 0;
    state.worldNeedsSnapshot.length = 0;
    state.initialized = false;
  }

  snapshot(world: UserWorld): void {
    const state = this.getState(world);

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
        world.notifyEntityChanged(entityId);
      }
    }
    state.worldNeedsSnapshot.length = 0;
  }

  markWorldNeedsSnapshot(world: UserWorld, transform: WorldTransform2D): void {
    this.getState(world).worldNeedsSnapshot.push(transform);
  }

  #initialize(world: UserWorld, state: Transform2DWorldState): void {
    if (state.initialized) {
      return;
    }

    world.forEach(Transform2D, (entityId) => state.dirtyEntityIds.push(entityId));
    world.forEach(WorldTransform2D, (entityId, transform) => {
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
