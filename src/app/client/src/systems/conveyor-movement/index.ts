import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { PlayerComponent } from "@client/components/player";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { BELT_QUERY_FILTER, FEET_MIN_OVERLAP_RATIO, SHARED_BELT_WORLD_TRANSFORM, SHARED_FEET_WORLD_TRANSFORM, SHARED_MOTION } from "@client/systems/conveyor-movement/constants";
import { ConveyorMovementGroupedUtilities } from "@client/systems/conveyor-movement/utils";
import { ConveyorGeometryUtils } from "@client/systems/conveyor-movement/utils/geometry-utils";
import { createSystem, resolveWorldTransform2D, type EntityId } from "@engine";
import { Transform2D } from "@engine/components";
import { Delta, fromContext, World } from "@engine/context";
import { RectangleCollider } from "@libs/physics";

export const System = createSystem("main:conveyor-movement")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);
    const seconds = updateDelta / 1000;

    ConveyorMovementGroupedUtilities.cleanupOrphanFeet(world);

    const [playerId] = world.invariantQuery(PlayerComponent);
    const playerTransform = world.require(playerId, Transform2D);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    const feetEntityId = ConveyorMovementGroupedUtilities.ensureFeetEntity(world, playerId);
    const feetGeometry = ConveyorMovementGroupedUtilities.resolveFeetGeometry(world, physicsWorld, feetEntityId);
    if (!feetGeometry) {
      return;
    }

    const feetBody = physicsWorld.getBody(feetEntityId);
    if (!feetBody) {
      return;
    }

    const overlaps = physicsWorld.queryOverlap({
      collider: feetBody.collider,
      transform: SHARED_FEET_WORLD_TRANSFORM,
      filter: BELT_QUERY_FILTER,
    });

    let bestOverlapRatio = 0;
    let bestBeltEntityId: EntityId | undefined;
    let bestBeltCollider: RectangleCollider | undefined;

    for (const overlap of overlaps) {
      const beltComponent = world.get(overlap.entityId, ConveyorBeltComponent);
      if (!beltComponent) {
        continue;
      }

      const beltTransform = resolveWorldTransform2D(world, overlap.entityId, SHARED_BELT_WORLD_TRANSFORM)
        ? SHARED_BELT_WORLD_TRANSFORM
        : overlap.transform;

      const overlapRatio = ConveyorGeometryUtils.computeFeetOverlapRatio(
        feetGeometry,
        overlap.collider,
        beltTransform,
      );
      if (overlapRatio < FEET_MIN_OVERLAP_RATIO) {
        continue;
      }

      if (overlapRatio <= bestOverlapRatio) {
        continue;
      }

      bestOverlapRatio = overlapRatio;
      bestBeltEntityId = overlap.entityId;
      bestBeltCollider = overlap.collider instanceof RectangleCollider ? overlap.collider : undefined;
    }

    if (bestBeltEntityId === undefined || !bestBeltCollider) {
      return;
    }

    const belt = world.get(bestBeltEntityId, ConveyorBeltComponent);
    const beltTransform = world.get(bestBeltEntityId, Transform2D);

    if (!belt || !beltTransform) {
      return;
    }

    const beltWorldTransform = resolveWorldTransform2D(world, bestBeltEntityId, SHARED_BELT_WORLD_TRANSFORM)
      ? SHARED_BELT_WORLD_TRANSFORM
      : beltTransform;

    ConveyorMovementGroupedUtilities.resolveBeltMotionVector(
      belt.variant,
      playerTransform.curr.pos.x,
      playerTransform.curr.pos.y,
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
