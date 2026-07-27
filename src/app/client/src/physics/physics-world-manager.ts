import type { Registry } from "@engine";
import { syncWorldTransform2D } from "@engine/systems/worldTransform2D";
import { PhysicsWorld } from "@libs/physics";

type PhysicsWorldState = {
  frameId: number;
  world: PhysicsWorld;
};

export class PhysicsWorldManager {
  static #frameId = 0;
  static readonly #states = new WeakMap<Registry, PhysicsWorldState>();

  public static beginFrame(world: Registry): void {
    PhysicsWorldManager.#frameId += 1;
    PhysicsWorldManager.requireWorld(world);
  }

  public static requireWorld(world: Registry): PhysicsWorld {
    syncWorldTransform2D(world);
    const state = PhysicsWorldManager.#states.get(world);

    if (!state) {
      const physicsWorld = new PhysicsWorld();
      physicsWorld.build(world);
      PhysicsWorldManager.#states.set(world, { frameId: PhysicsWorldManager.#frameId, world: physicsWorld });
      return physicsWorld;
    }

    if (state.frameId === PhysicsWorldManager.#frameId) {
      return state.world;
    }

    state.world.build(world);
    state.frameId = PhysicsWorldManager.#frameId;
    return state.world;
  }
}
