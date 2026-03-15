import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { destroyTransportBelt } from "@client/entities/transport-belt";
import { TransportBeltAutoShapeManager } from "@client/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { destroyPlaceableWall, PlaceableWallAutoShapeManager, PlaceableWallComponent } from "@client/entities/wall";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { GridNeighborQuery } from "@client/systems/world/build-mode/grid-neighbor-query";
import {
    GridSingleton,
    type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";
import {
    BOX_SIZE,
    DELETE_POINT_RADIUS,
    HALF_BOX_SIZE,
} from "@client/systems/world/build-mode/metrics";
import { Vec2, type EntityId, type MousePoint, type UserWorld } from "@engine";
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


    /***** TRANSPORT BELTS *****/
    if (world.has(hit.entityId, ConveyorBeltComponent)) {
      const beltCoordinates = GridNeighborQuery.resolveEntityCoordinates(world, hit.entityId);

      destroyTransportBelt(world, hit.entityId);

      TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(world, beltCoordinates);

      return;
    }


    /***** PLACEABLE WALLS *****/
    if (world.has(hit.entityId, PlaceableWallComponent)) {
      const wallCoordinates = GridNeighborQuery.resolveEntityCoordinates(world, hit.entityId);

      destroyPlaceableWall(world, hit.entityId);
      PlaceableWallAutoShapeManager.refreshWallsNearCoordinates(world, wallCoordinates);

      return;
    }

    world.destroy(hit.entityId);
  }

  public static replaceTransportBeltAt(world: UserWorld, x: number, y: number): void {
    const targetCoordinates = GridSingleton.worldToGridCoordinates(x, y);

    PlacementQueries.destroyPlacementOccupantsByGrid(world, targetCoordinates, {
      shouldDestroy(occupant) {
        return inLayer(occupant.participation.layers, COLLISION_LAYERS.CONVEYOR);
      },
      destroy(worldToMutate, entityId) {
        destroyTransportBelt(worldToMutate, entityId);
      },
    });
  }

  public static destroyPlacementOccupantsByGrid(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    options: {
      mask?: CollisionLayerMask;
      shouldDestroy?: (occupant: PhysicsBody) => boolean;
      destroy: (world: UserWorld, entityId: EntityId) => void;
    },
  ): void {
    const overlaps = PlacementQueries.queryPlacementOccupantsByGrid(world, gridCoordinates, options.mask);

    for (const overlap of overlaps) {
      if (options.shouldDestroy && !options.shouldDestroy(overlap)) {
        continue;
      }

      options.destroy(world, overlap.entityId);
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
