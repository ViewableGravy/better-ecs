import { GhostPreviewComponent } from "@client/entities/ghost";
import { GridPosition } from "@client/systems/world/build-mode/components/grid-position";
import {
    GridSingleton,
    type GridCoordinate,
    type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type CardinalSide = "left" | "right" | "top" | "bottom";

type FindGridEntityAtCoordinatesOptions<TComponent> = {
  excludeEntityId?: EntityId;
  includeGhosts?: boolean;
  predicate?: (entityId: EntityId, component: TComponent) => boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const CARDINAL_GRID_OFFSETS: Readonly<Record<CardinalSide, readonly [x: number, y: number]>> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

export class GridNeighborQuery {
  public static resolveEntityCoordinates(world: UserWorld, entityId: EntityId): GridCoordinates {
    const gridPosition = world.get(entityId, GridPosition);

    if (gridPosition) {
      return [gridPosition.x, gridPosition.y];
    }

    const transform = world.require(entityId, Transform2D);

    return GridSingleton.worldToGridCoordinates(
      transform.curr.pos.x, 
      transform.curr.pos.y
    );
  }

  public static offsetCoordinates(coordinates: GridCoordinates, offset: readonly [x: number, y: number]): GridCoordinates {
    return [
      (Number(coordinates[0]) + offset[0]) as GridCoordinate,
      (Number(coordinates[1]) + offset[1]) as GridCoordinate,
    ];
  }

  public static resolveNeighborCoordinates(coordinates: GridCoordinates, side: CardinalSide): GridCoordinates {
    return this.offsetCoordinates(coordinates, CARDINAL_GRID_OFFSETS[side]);
  }

  public static findEntityAtCoordinates<TComponent>(
    world: UserWorld,
    entityIds: Iterable<EntityId>,
    resolveComponent: (entityId: EntityId) => TComponent,
    coordinates: GridCoordinates,
    options: FindGridEntityAtCoordinatesOptions<TComponent> = {},
  ): EntityId | null {
    for (const entityId of entityIds) {
      if (options.excludeEntityId !== undefined && entityId === options.excludeEntityId) {
        continue;
      }

      if (!options.includeGhosts && world.has(entityId, GhostPreviewComponent)) {
        continue;
      }

      const component = resolveComponent(entityId);

      if (options.predicate && !options.predicate(entityId, component)) {
        continue;
      }

      const entityCoordinates = this.resolveEntityCoordinates(world, entityId);

      if (!GridSingleton.areCoordinatesEqual(entityCoordinates, coordinates)) {
        continue;
      }

      return entityId;
    }

    return null;
  }

  public static resolveNeighborEntityId<TComponent>(
    world: UserWorld,
    entityIds: Iterable<EntityId>,
    resolveComponent: (entityId: EntityId) => TComponent,
    coordinates: GridCoordinates,
    side: CardinalSide,
    options: FindGridEntityAtCoordinatesOptions<TComponent> = {},
  ): EntityId | null {
    return this.findEntityAtCoordinates(
      world,
      entityIds,
      resolveComponent,
      this.resolveNeighborCoordinates(coordinates, side),
      options,
    );
  }
}