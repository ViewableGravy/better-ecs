import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import type { BuildItemType } from "@client/scenes/world/systems/build-mode/const";
import {
  BOX_SIZE,
  DELETE_POINT_RADIUS,
  HALF_BOX_SIZE,
  TRANSPORT_BELT_COLLIDER_SIZE,
  TRANSPORT_BELT_OFFSET_X,
  TRANSPORT_BELT_OFFSET_Y,
} from "@client/scenes/world/systems/build-mode/const";
import {
  GridSingleton,
  type GridCoordinates,
} from "@client/scenes/world/systems/build-mode/grid-singleton";
import { Vec2, type MousePoint, type UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import {
  CircleCollider,
  COLLISION_LAYERS,
  inLayer,
  RectangleCollider,
} from "@libs/physics";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class Placement {
  private static readonly gridColliderInsetPx = 1;
  private static readonly insetHalfBoxSize = HALF_BOX_SIZE - Placement.gridColliderInsetPx;
  private static readonly insetBoxSize = BOX_SIZE - Placement.gridColliderInsetPx * 2;

  private static readonly placementCollider = new RectangleCollider(
    new Vec2(-Placement.insetHalfBoxSize, -Placement.insetHalfBoxSize),
    new Vec2(Placement.insetBoxSize, Placement.insetBoxSize),
  );

  private static readonly placementTransform = new Transform2D(0, 0);
  private static readonly transportBeltPlacementCollider = new RectangleCollider(
    new Vec2(-TRANSPORT_BELT_COLLIDER_SIZE * 0.5, -TRANSPORT_BELT_COLLIDER_SIZE * 0.5),
    new Vec2(TRANSPORT_BELT_COLLIDER_SIZE, TRANSPORT_BELT_COLLIDER_SIZE),
  );
  private static readonly transportBeltPlacementTransform = new Transform2D(0, 0);
  private static readonly deletePointCollider = new CircleCollider(DELETE_POINT_RADIUS);
  private static readonly deletePointTransform = new Transform2D(0, 0);

  private static readonly placementFilter = {
    category: COLLISION_LAYERS.QUERY,
    mask: COLLISION_LAYERS.SOLID | COLLISION_LAYERS.CONVEYOR,
  };

  private static readonly conveyorMask = COLLISION_LAYERS.CONVEYOR;

  public static deleteAt(world: UserWorld, worldPointer: MousePoint): void {
    Placement.deletePointTransform.curr.pos.set(worldPointer.x, worldPointer.y);
    Placement.deletePointTransform.prev.pos.set(worldPointer.x, worldPointer.y);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);

    const hit = physicsWorld.queryFirstOverlap({
      collider: Placement.deletePointCollider,
      transform: Placement.deletePointTransform,
      filter: Placement.placementFilter,
    });

    if (hit) {
      world.destroy(hit.entityId);
    }
  }

  public static canPlaceItem(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    selectedItem: BuildItemType,
  ): boolean {
    if (selectedItem === "box") {
      return Placement.canSpawnBox(world, gridCoordinates);
    }

    if (selectedItem === "transport-belt-horizontal-right") {
      return Placement.canSpawnTransportBelt(world, gridCoordinates);
    }

    return false;
  }

  public static canSpawnBox(world: UserWorld, gridCoordinates: GridCoordinates): boolean {
    const hit = Placement.queryFirstPlacementOverlap(world, gridCoordinates);
    return hit === undefined;
  }

  public static canSpawnTransportBelt(world: UserWorld, gridCoordinates: GridCoordinates): boolean {
    const overlaps = Placement.queryTransportBeltOverlapsByGrid(world, gridCoordinates);

    for (const overlap of overlaps) {
      if (inLayer(overlap.participation.layers, Placement.conveyorMask)) {
        continue;
      }

      return false;
    }

    return true;
  }

  public static replaceTransportBeltAt(world: UserWorld, x: number, y: number): void {
    const targetCoordinates = GridSingleton.worldToGridCoordinates(x, y);
    const overlaps = Placement.queryTransportBeltOverlapsByWorld(world, x, y);

    for (const overlap of overlaps) {
      if (!inLayer(overlap.participation.layers, Placement.conveyorMask)) {
        continue;
      }

      const overlapCoordinates = GridSingleton.worldToGridCoordinates(
        overlap.transform.curr.pos.x,
        overlap.transform.curr.pos.y,
      );

      if (!GridSingleton.areCoordinatesEqual(targetCoordinates, overlapCoordinates)) {
        continue;
      }

      world.destroy(overlap.entityId);
    }
  }

  private static queryTransportBeltOverlapsByGrid(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
  ) {
    const [tileOriginX, tileOriginY] = GridSingleton.gridCoordinatesToWorldOrigin(gridCoordinates);

    const beltCenterX = tileOriginX + TRANSPORT_BELT_OFFSET_X;
    const beltCenterY = tileOriginY + TRANSPORT_BELT_OFFSET_Y;

    return Placement.queryTransportBeltOverlapsByWorld(world, beltCenterX, beltCenterY);
  }

  private static queryTransportBeltOverlapsByWorld(world: UserWorld, x: number, y: number) {
    Placement.transportBeltPlacementTransform.curr.pos.set(x, y);
    Placement.transportBeltPlacementTransform.prev.pos.set(x, y);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);

    return physicsWorld.queryOverlap({
      collider: Placement.transportBeltPlacementCollider,
      transform: Placement.transportBeltPlacementTransform,
      filter: Placement.placementFilter,
    });
  }

  private static queryFirstPlacementOverlap(world: UserWorld, gridCoordinates: GridCoordinates) {
    const [tileCenterX, tileCenterY] = GridSingleton.gridCoordinatesToWorldCenter(gridCoordinates);

    Placement.placementTransform.curr.pos.set(tileCenterX, tileCenterY);
    Placement.placementTransform.prev.pos.set(tileCenterX, tileCenterY);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);

    return physicsWorld.queryFirstOverlap({
      collider: Placement.placementCollider,
      transform: Placement.placementTransform,
      filter: Placement.placementFilter,
    });
  }
}

