import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { PlayerComponent } from "@client/components/player";
import { PlayerFeetComponent } from "@client/components/player-feet";
import { ConveyorMovementUtils } from "@client/entities/transport-belt/motion/ConveyorMovementUtils";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { BELT_QUERY_FILTER, SHARED_BELT_WORLD_TRANSFORM, SHARED_FEET_WORLD_TRANSFORM, SHARED_MOTION } from "@client/systems/world/conveyor-movement/constants";
import { createSystem, resolveWorldTransform2D, Vec2, type EntityId } from "@engine";
import { Transform2D } from "@engine/components";
import { Delta, fromContext, World } from "@engine/context";
import { PointCollider, RectangleCollider } from "@libs/physics";
import invariant from "tiny-invariant";

const FEET_POINT_COLLIDER = new PointCollider();

export const System = createSystem("main:conveyor-movement")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);
    const seconds = updateDelta / 1000;

    // acquire players feet
    const [playerId] = world.invariantQuery(PlayerComponent);
    const [feetEntityId] = world.invariantQuery(PlayerFeetComponent);
    const playerTransform = world.require(playerId, Transform2D);
    
    invariant(
      resolveWorldTransform2D(world, feetEntityId, SHARED_FEET_WORLD_TRANSFORM),
      "Feet world transform could not be resolved",
    );

    const feetWorldPosition = SHARED_FEET_WORLD_TRANSFORM.curr.pos;
    const physicsWorld = PhysicsWorldManager.requireWorld(world);

    const overlaps = physicsWorld.queryOverlap({
      collider: FEET_POINT_COLLIDER,
      transform: SHARED_FEET_WORLD_TRANSFORM,
      filter: BELT_QUERY_FILTER,
    });

    // Find the closest conveyor belt to the player's feet among the overlaps
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

      const distanceSquared = Vec2.distanceSquared(feetWorldPosition, beltTransform.curr.pos);

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
      feetWorldPosition.x,
      feetWorldPosition.y,
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
    playerTransform.curr.pos.x += SHARED_MOTION.x * step;
    playerTransform.curr.pos.y += SHARED_MOTION.y * step;
  },
});
