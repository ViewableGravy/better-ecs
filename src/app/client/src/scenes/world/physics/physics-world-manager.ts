import type { UserWorld } from "@engine";
import { PhysicsWorld } from "@libs/physics";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type PhysicsWorldState = {
  builtFrameId: number;
  world: PhysicsWorld;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class PhysicsWorldManager {
  private static frameId = 0;
  private static readonly statesByWorld = new WeakMap<UserWorld, PhysicsWorldState>();

  /**
   * Must be called at the start of each frame with all worlds that will require a PhysicsWorld this frame, 
   * to ensure they are built and up to date.
   */
  public static beginFrame(worlds: Iterable<UserWorld>): void {
    PhysicsWorldManager.frameId += 1;

    for (const world of worlds) {
      PhysicsWorldManager.ensureBuilt(world);
    }
  }

  public static requireWorld(world: UserWorld): PhysicsWorld {
    return PhysicsWorldManager.ensureBuilt(world);
  }

  /**
   * Ensures a PhysicsWorld is built for the given world and up to date for the current frame, returning it.
   */
  private static ensureBuilt(world: UserWorld): PhysicsWorld {
    let state = PhysicsWorldManager.statesByWorld.get(world);

    if (!state) {
      const physicsWorld = new PhysicsWorld();
      physicsWorld.build(world);

      state = {
        builtFrameId: PhysicsWorldManager.frameId,
        world: physicsWorld,
      };

      PhysicsWorldManager.statesByWorld.set(world, state);
      return state.world;
    }

    if (state.builtFrameId !== PhysicsWorldManager.frameId) {
      state.world.build(world);
      state.builtFrameId = PhysicsWorldManager.frameId;
    }

    return state.world;
  }
}
