import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { type TransportBeltVariant } from "@client/entities/transport-belt/consts";
import {
    GridNeighborQuery,
    type CardinalSide,
} from "@client/systems/world/build-mode/grid-neighbor-query";
import { type GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";

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
    return GridNeighborQuery.resolveEntityCoordinates(world, beltEntityId);
  }

  public static offsetCoordinates(
    coordinates: GridCoordinates,
    offset: readonly [x: number, y: number],
  ): GridCoordinates {
    return GridNeighborQuery.offsetCoordinates(coordinates, offset);
  }

  public static resolveNeighborCoordinates(
    coordinates: GridCoordinates,
    side: CardinalSide,
  ): GridCoordinates {
    return GridNeighborQuery.resolveNeighborCoordinates(coordinates, side);
  }

  public static findBeltEntityAtCoordinates(
    world: UserWorld,
    coordinates: GridCoordinates,
    options: FindBeltEntityAtCoordinatesOptions = {},
  ): EntityId | null {
    return GridNeighborQuery.findEntityAtCoordinates(
      world,
      world.query(ConveyorBeltComponent),
      (beltEntityId) => world.require(beltEntityId, ConveyorBeltComponent),
      coordinates,
      options,
    );
  }

  public static resolveNeighborEntityId(
    world: UserWorld,
    coordinates: GridCoordinates,
    side: CardinalSide,
    options: FindBeltEntityAtCoordinatesOptions = {},
  ): EntityId | null {
    return GridNeighborQuery.resolveNeighborEntityId(
      world,
      world.query(ConveyorBeltComponent),
      (beltEntityId) => world.require(beltEntityId, ConveyorBeltComponent),
      coordinates,
      side,
      options,
    );
  }

  public static buildNeighborMatrix(
    world: UserWorld,
    coordinates: GridCoordinates,
  ): TransportBeltNeighborMatrix {
    const variantsByOffset = new Map<string, TransportBeltVariant>();

    for (const beltEntityId of world.query(ConveyorBeltComponent)) {
      const belt = world.get(beltEntityId, ConveyorBeltComponent);
      const beltCoordinates = GridNeighborQuery.resolveEntityCoordinates(world, beltEntityId);
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
