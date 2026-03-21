import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { PlayerComponent } from "@client/components/player";
import { ConveyorMovementUtils } from "@client/entities/transport-belt/motion/ConveyorMovementUtils";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { BELT_QUERY_FILTER, SHARED_BELT_WORLD_TRANSFORM, SHARED_MOTION, SHARED_PLAYER_WORLD_TRANSFORM } from "@client/systems/world/conveyor-movement/constants";
import { createSystem, mutate, resolveWorldTransform2D, Vec2, type EntityId } from "@engine";
import { Transform2D } from "@engine/components";
import { Delta, fromContext, World } from "@engine/context";
import { COLLISION_LAYERS, RectangleCollider } from "@libs/physics";

export const System = createSystem("main:conveyor-movement")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);
    const seconds = updateDelta / 1000;
    const physicsWorld = PhysicsWorldManager.requireWorld(world);

    const [playerId] = world.invariantQuery(PlayerComponent);
    const playerTransform = world.require(playerId, Transform2D);
    const playerBody = physicsWorld.queryFirstLayer(COLLISION_LAYERS.ACTOR, PlayerComponent);

    if (!playerBody) {
      return;
    }

    const playerWorldTransform = resolveWorldTransform2D(world, playerId, SHARED_PLAYER_WORLD_TRANSFORM)
      ? SHARED_PLAYER_WORLD_TRANSFORM
      : playerBody.transform;

    const playerWorldPosition = playerWorldTransform.curr.pos;

    const overlaps = physicsWorld.queryOverlap({
      collider: playerBody.collider,
      transform: playerWorldTransform,
      filter: BELT_QUERY_FILTER,
    });

    // Find the closest conveyor belt to the player's grounded body among the overlaps.
    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    let bestBeltEntityId: EntityId | undefined;
    let bestBeltCollider: RectangleCollider | undefined;

    for (const overlap of overlaps) {
      // skip anything that is not a conveyor belt
      const beltComponent = world.get(overlap.entityId, ConveyorBeltComponent);
      if (!beltComponent) {
        continue;
      }

      // skip anything that is not a rectangle collider (should not happen, but just in case)
      if (!(overlap.collider instanceof RectangleCollider)) {
        continue;
      }

      const beltTransform = resolveWorldTransform2D(world, overlap.entityId, SHARED_BELT_WORLD_TRANSFORM)
        ? SHARED_BELT_WORLD_TRANSFORM
        : overlap.transform;

      const distanceSquared = Vec2.distanceSquared(playerWorldPosition, beltTransform.curr.pos);

      if (distanceSquared >= bestDistanceSquared) {
        continue;
      }

      bestDistanceSquared = distanceSquared;
      bestBeltEntityId = overlap.entityId;
      bestBeltCollider = overlap.collider;
    }

    if (bestBeltEntityId === undefined || !bestBeltCollider) {
      return;
    }

    const belt = world.require(bestBeltEntityId, ConveyorBeltComponent);
    const beltTransform = world.require(bestBeltEntityId, Transform2D);

    const beltWorldTransform = resolveWorldTransform2D(world, bestBeltEntityId, SHARED_BELT_WORLD_TRANSFORM)
      ? SHARED_BELT_WORLD_TRANSFORM
      : beltTransform;

    // resolve the motion vector into SHARED_MOTION to avoid allocations
    ConveyorMovementUtils.resolveBeltMotionVector(
      belt.variant,
      playerWorldPosition.x,
      playerWorldPosition.y,
      beltWorldTransform,
      bestBeltCollider,
      SHARED_MOTION,
    );

    // if the motion vector is zero, skip the rest of the logic to avoid unnecessary calculations
    if (SHARED_MOTION.x === 0 && SHARED_MOTION.y === 0) {
      return;
    }

    // apply the motion to the player's transform
    const step = belt.speed * seconds;
    mutate(playerTransform, "curr", (curr) => {
      curr.pos.x += SHARED_MOTION.x * step;
      curr.pos.y += SHARED_MOTION.y * step;
    });
  },
});
