import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { GhostPreviewComponent } from "@client/entities/ghost";
import { TRANSPORT_BELT_SIDE_GRID_OFFSETS, type TransportBeltVariant } from "@client/entities/transport-belt/consts";
import { GridSingleton, type GridCoordinate, type GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type TransportBeltNeighborCell = TransportBeltVariant | null;
export type TransportBeltNeighborRow = readonly [TransportBeltNeighborCell, TransportBeltNeighborCell, TransportBeltNeighborCell];
export type TransportBeltNeighborMatrix = readonly [
  TransportBeltNeighborRow,
  TransportBeltNeighborRow,
  TransportBeltNeighborRow,
];

type FindBeltEntityAtCoordinatesOptions = {
  excludeEntityId?: EntityId;
  includeGhosts?: boolean;
  predicate?: (beltEntityId: EntityId, belt: ConveyorBeltComponent) => boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class TransportBeltGridQuery {
  public static resolveBeltCoordinates(
    world: UserWorld,
    beltEntityId: EntityId,
  ): GridCoordinates {
    const transform = world.require(beltEntityId, Transform2D);

    return GridSingleton.worldToGridCoordinates(transform.curr.pos.x, transform.curr.pos.y);
  }

  public static offsetCoordinates(
    coordinates: GridCoordinates,
    offset: readonly [x: number, y: number],
  ): GridCoordinates {
    return [
      (Number(coordinates[0]) + offset[0]) as GridCoordinate,
      (Number(coordinates[1]) + offset[1]) as GridCoordinate,
    ];
  }

  public static resolveNeighborCoordinates(
    coordinates: GridCoordinates,
    side: keyof typeof TRANSPORT_BELT_SIDE_GRID_OFFSETS,
  ): GridCoordinates {
    return this.offsetCoordinates(coordinates, TRANSPORT_BELT_SIDE_GRID_OFFSETS[side]);
  }

  public static findBeltEntityAtCoordinates(
    world: UserWorld,
    coordinates: GridCoordinates,
    options: FindBeltEntityAtCoordinatesOptions = {},
  ): EntityId | null {
    for (const beltEntityId of world.query(ConveyorBeltComponent, Transform2D)) {
      if (options.excludeEntityId !== undefined && beltEntityId === options.excludeEntityId) {
        continue;
      }

      if (!options.includeGhosts && world.has(beltEntityId, GhostPreviewComponent)) {
        continue;
      }

      const belt = world.get(beltEntityId, ConveyorBeltComponent);

      if (options.predicate && !options.predicate(beltEntityId, belt)) {
        continue;
      }

      const beltCoordinates = this.resolveBeltCoordinates(world, beltEntityId);

      if (!GridSingleton.areCoordinatesEqual(beltCoordinates, coordinates)) {
        continue;
      }

      return beltEntityId;
    }

    return null;
  }

  public static resolveNeighborEntityId(
    world: UserWorld,
    coordinates: GridCoordinates,
    side: keyof typeof TRANSPORT_BELT_SIDE_GRID_OFFSETS,
    options: FindBeltEntityAtCoordinatesOptions = {},
  ): EntityId | null {
    return this.findBeltEntityAtCoordinates(
      world,
      this.resolveNeighborCoordinates(coordinates, side),
      options,
    );
  }

  public static buildNeighborMatrix(
    world: UserWorld,
    coordinates: GridCoordinates,
  ): TransportBeltNeighborMatrix {
    const variantsByOffset = new Map<string, TransportBeltVariant>();

    for (const beltEntityId of world.query(ConveyorBeltComponent, Transform2D)) {
      if (world.has(beltEntityId, GhostPreviewComponent)) {
        continue;
      }

      const belt = world.get(beltEntityId, ConveyorBeltComponent);
      const beltCoordinates = this.resolveBeltCoordinates(world, beltEntityId);
      const offsetX = Number(beltCoordinates[0]) - Number(coordinates[0]);
      const offsetY = Number(beltCoordinates[1]) - Number(coordinates[1]);

      if (Math.abs(offsetX) > 1 || Math.abs(offsetY) > 1) {
        continue;
      }

      variantsByOffset.set(`${offsetX},${offsetY}`, belt.variant as TransportBeltVariant);
    }

    return [
      [
        variantsByOffset.get("-1,-1") ?? null,
        variantsByOffset.get("0,-1") ?? null,
        variantsByOffset.get("1,-1") ?? null,
      ],
      [
        variantsByOffset.get("-1,0") ?? null,
        variantsByOffset.get("0,0") ?? null,
        variantsByOffset.get("1,0") ?? null,
      ],
      [
        variantsByOffset.get("-1,1") ?? null,
        variantsByOffset.get("0,1") ?? null,
        variantsByOffset.get("1,1") ?? null,
      ],
    ];
  }
}
