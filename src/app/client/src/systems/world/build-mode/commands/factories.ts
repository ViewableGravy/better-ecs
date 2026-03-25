import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import type { BuildItemType } from "@client/systems/world/build-mode/build-items";
import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import { createPoolFactory, type PoolFactory } from "@engine";
import type { BuildModeDeleteCommand, BuildModePlaceCommand } from "@libs/commands/build-mode";
import type { ContextId } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createBuildModePlaceCommandFactory(): PoolFactory<
  BuildModePlaceCommand,
  readonly [BuildItemType, ContextId, GridCoordinate, GridCoordinate, TransportBeltSide]
> {
  return createPoolFactory(
    (): BuildModePlaceCommand => ({
      type: "build-mode:place",
      itemType: "box",
      contextId: "" as ContextId,
      gridX: 0 as GridCoordinate,
      gridY: 0 as GridCoordinate,
      placementEndSide: "top",
    }),
    (value, itemType, contextId, gridX, gridY, placementEndSide) => {
      value.type = "build-mode:place";
      value.itemType = itemType;
      value.contextId = contextId;
      value.gridX = gridX;
      value.gridY = gridY;
      value.placementEndSide = placementEndSide;
    },
  );
}

export function createBuildModeDeleteCommandFactory(): PoolFactory<
  BuildModeDeleteCommand,
  readonly [ContextId, GridCoordinate, GridCoordinate]
> {
  return createPoolFactory(
    (): BuildModeDeleteCommand => ({
      type: "build-mode:delete",
      contextId: "" as ContextId,
      gridX: 0 as GridCoordinate,
      gridY: 0 as GridCoordinate,
    }),
    (value, contextId, gridX, gridY) => {
      value.type = "build-mode:delete";
      value.contextId = contextId;
      value.gridX = gridX;
      value.gridY = gridY;
    },
  );
}