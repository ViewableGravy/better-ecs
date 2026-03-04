import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { PlayerComponent } from "@client/components/player";
import { PlayerFeetComponent } from "@client/components/player-feet";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { BELT_QUERY_FILTER, SHARED_BELT_WORLD_TRANSFORM, SHARED_FEET_WORLD_TRANSFORM, SHARED_MOTION } from "@client/systems/conveyor-movement/constants";
import { ConveyorMovementUtils } from "@client/systems/conveyor-movement/utils";
import { createSystem, resolveWorldTransform2D, type EntityId } from "@engine";
import { Transform2D } from "@engine/components";
import { Delta, fromContext, World } from "@engine/context";
import { PointCollider, RectangleCollider } from "@libs/physics";

const FEET_POINT_COLLIDER = new PointCollider();

export const System = createSystem("main:conveyor-movement")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);
    const seconds = updateDelta / 1000;

    const [playerId] = world.invariantQuery(PlayerComponent);
    const [feetEntityId] = world.invariantQuery(PlayerFeetComponent);
    const playerTransform = world.require(playerId, Transform2D);
    const feetWorldPosition = ConveyorMovementUtils.requireFeetWorldPosition(world, feetEntityId);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    SHARED_FEET_WORLD_TRANSFORM.curr.pos.set(feetWorldPosition.x, feetWorldPosition.y);
    SHARED_FEET_WORLD_TRANSFORM.prev.pos.set(feetWorldPosition.x, feetWorldPosition.y);

    const overlaps = physicsWorld.queryOverlap({
      collider: FEET_POINT_COLLIDER,
      transform: SHARED_FEET_WORLD_TRANSFORM,
      filter: BELT_QUERY_FILTER,
    });

    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    let bestBeltEntityId: EntityId | undefined;
    let bestBeltCollider: RectangleCollider | undefined;

    for (const overlap of overlaps) {
      const beltComponent = world.get(overlap.entityId, ConveyorBeltComponent);
      if (!beltComponent) {
        continue;
      }

      if (!(overlap.collider instanceof RectangleCollider)) {
        continue;
      }

      const beltTransform = resolveWorldTransform2D(world, overlap.entityId, SHARED_BELT_WORLD_TRANSFORM)
        ? SHARED_BELT_WORLD_TRANSFORM
        : overlap.transform;

      const dx = feetWorldPosition.x - beltTransform.curr.pos.x;
      const dy = feetWorldPosition.y - beltTransform.curr.pos.y;
      const distanceSquared = dx * dx + dy * dy;

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

    ConveyorMovementUtils.resolveBeltMotionVector(
      belt.variant,
      feetWorldPosition.x,
      feetWorldPosition.y,
      beltWorldTransform,
      bestBeltCollider,
      SHARED_MOTION,
    );

    if (SHARED_MOTION.x === 0 && SHARED_MOTION.y === 0) {
      return;
    }

    const step = belt.speed * seconds;
    playerTransform.curr.pos.x += SHARED_MOTION.x * step;
    playerTransform.curr.pos.y += SHARED_MOTION.y * step;
  },
});
