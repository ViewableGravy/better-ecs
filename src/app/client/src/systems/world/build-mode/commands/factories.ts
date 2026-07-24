import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import type { BuildItemType } from "@client/systems/world/build-mode/build-items";
import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import { createPoolFactory, type PoolFactory } from "@engine";
import type { BuildModeDeleteCommand, BuildModePlaceCommand } from "@libs/commands/build-mode";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createBuildModePlaceCommandFactory(): PoolFactory<
  BuildModePlaceCommand,
  readonly [BuildItemType, GridCoordinate, GridCoordinate, TransportBeltSide]
> {
  return createPoolFactory(
    (): BuildModePlaceCommand => ({
      type: "build-mode:place",
      itemType: "box",
      gridX: 0 as GridCoordinate,
      gridY: 0 as GridCoordinate,
      placementEndSide: "top",
    }),
    (value, itemType, gridX, gridY, placementEndSide) => {
      value.type = "build-mode:place";
      value.itemType = itemType;
      value.gridX = gridX;
      value.gridY = gridY;
      value.placementEndSide = placementEndSide;
    },
  );
}

export function createBuildModeDeleteCommandFactory(): PoolFactory<
  BuildModeDeleteCommand,
  readonly [GridCoordinate, GridCoordinate]
> {
  return createPoolFactory(
    (): BuildModeDeleteCommand => ({
      type: "build-mode:delete",
      gridX: 0 as GridCoordinate,
      gridY: 0 as GridCoordinate,
    }),
    (value, gridX, gridY) => {
      value.type = "build-mode:delete";
      value.gridX = gridX;
      value.gridY = gridY;
    },
  );
}
