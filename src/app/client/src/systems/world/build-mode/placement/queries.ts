import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { destroyTransportBelt } from "@client/entities/transport-belt";
import { TransportBeltAutoShapeManager } from "@client/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import {
  BOX_SIZE,
  DELETE_POINT_RADIUS,
  HALF_BOX_SIZE,
} from "@client/systems/world/build-mode/const";
import {
  GridSingleton,
  type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";
import { Vec2, type MousePoint, type UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import {
  CircleCollider,
  COLLISION_LAYERS,
  inLayer,
  RectangleCollider,
  type CollisionLayerMask,
  type PhysicsBody,
} from "@libs/physics";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class PlacementQueries {
  private static readonly gridColliderInsetPx = 1;
  private static readonly insetHalfBoxSize = HALF_BOX_SIZE - PlacementQueries.gridColliderInsetPx;
  private static readonly insetBoxSize = BOX_SIZE - PlacementQueries.gridColliderInsetPx * 2;

  private static readonly placementCollider = new RectangleCollider(
    new Vec2(-PlacementQueries.insetHalfBoxSize, -PlacementQueries.insetHalfBoxSize),
    new Vec2(PlacementQueries.insetBoxSize, PlacementQueries.insetBoxSize),
  );

  private static readonly placementTransform = new Transform2D(0, 0);
  private static readonly deletePointCollider = new CircleCollider(DELETE_POINT_RADIUS);
  private static readonly deletePointTransform = new Transform2D(0, 0);

  private static readonly placementFilter = {
    category: COLLISION_LAYERS.QUERY,
    mask: COLLISION_LAYERS.SOLID | COLLISION_LAYERS.CONVEYOR,
  };

  public static deleteAt(world: UserWorld, worldPointer: MousePoint): void {
    PlacementQueries.deletePointTransform.curr.pos.set(worldPointer.x, worldPointer.y);
    PlacementQueries.deletePointTransform.prev.pos.set(worldPointer.x, worldPointer.y);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    const hit = physicsWorld.queryFirstOverlap({
      collider: PlacementQueries.deletePointCollider,
      transform: PlacementQueries.deletePointTransform,
      filter: PlacementQueries.placementFilter,
    });

    if (!hit) {
      return;
    }

    if (world.has(hit.entityId, ConveyorBeltComponent)) {
      const transform = world.get(hit.entityId, Transform2D);
      const beltCoordinates = transform
        ? GridSingleton.worldToGridCoordinates(transform.curr.pos.x, transform.curr.pos.y)
        : null;

      destroyTransportBelt(world, hit.entityId);

      if (beltCoordinates) {
        TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(world, beltCoordinates);
      }

      return;
    }

    world.destroy(hit.entityId);
  }

  public static replaceTransportBeltAt(world: UserWorld, x: number, y: number): void {
    const targetCoordinates = GridSingleton.worldToGridCoordinates(x, y);
    const overlaps = PlacementQueries.queryPlacementOccupantsByGrid(world, targetCoordinates);

    for (const overlap of overlaps) {
      if (!inLayer(overlap.participation.layers, COLLISION_LAYERS.CONVEYOR)) {
        continue;
      }

      destroyTransportBelt(world, overlap.entityId);
    }
  }

  public static queryPlacementOccupantsByGrid(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    mask: CollisionLayerMask = PlacementQueries.placementFilter.mask,
  ): PhysicsBody[] {
    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    const overlaps: PhysicsBody[] = [];

    for (const body of physicsWorld.layers(mask)) {
      const overlapCoordinates = GridSingleton.worldToGridCoordinates(
        body.transform.curr.pos.x,
        body.transform.curr.pos.y,
      );

      if (!GridSingleton.areCoordinatesEqual(gridCoordinates, overlapCoordinates)) {
        continue;
      }

      overlaps.push(body);
    }

    return overlaps;
  }

  public static queryFirstPlacementOverlap(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    mask: CollisionLayerMask = PlacementQueries.placementFilter.mask,
  ): PhysicsBody | undefined {
    const [tileCenterX, tileCenterY] = GridSingleton.gridCoordinatesToWorldCenter(gridCoordinates);

    PlacementQueries.placementTransform.curr.pos.set(tileCenterX, tileCenterY);
    PlacementQueries.placementTransform.prev.pos.set(tileCenterX, tileCenterY);

    const physicsWorld = PhysicsWorldManager.requireWorld(world);

    return physicsWorld.queryFirstOverlap({
      collider: PlacementQueries.placementCollider,
      transform: PlacementQueries.placementTransform,
      filter: {
        ...PlacementQueries.placementFilter,
        mask,
      },
    });
  }
}
