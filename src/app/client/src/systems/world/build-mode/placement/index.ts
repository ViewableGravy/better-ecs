import type { MousePoint, UserWorld } from "@engine";

import {
  buildModeStateDefault,
  type BuildItemType,
  type BuildModeState,
} from "@client/systems/world/build-mode/const";
import {
  GridSingleton,
  type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";
import {
  type PlacementContext,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";
import {
  getPlacementDefinition,
  type RegisteredResolvedPlacement,
} from "@client/systems/world/build-mode/placement/registry";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class Placement {
  public static deleteAt(world: UserWorld, worldPointer: MousePoint): void {
    PlacementQueries.deleteAt(world, worldPointer);
  }

  public static canPlaceItem(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    selectedItem: BuildItemType,
    buildModeState: BuildModeState = {
      ...buildModeStateDefault,
      selectedItem,
    },
  ): boolean {
    const context = this.createContext(world, gridCoordinates, buildModeState);

    return this.canPlaceFromDefinition(getPlacementDefinition(selectedItem), context);
  }

  public static resolveSelection(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    buildModeState: BuildModeState,
  ): RegisteredResolvedPlacement | null {
    const selectedItem = buildModeState.selectedItem;

    if (selectedItem === null) {
      return null;
    }

    const context = this.createContext(world, gridCoordinates, buildModeState);

    return this.resolveSelectionFromDefinition(getPlacementDefinition(selectedItem), context);
  }

  private static createContext(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    buildModeState: BuildModeState,
  ): PlacementContext {
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(gridCoordinates);

    return {
      world,
      gridCoordinates,
      snappedX,
      snappedY,
      buildModeState,
    };
  }

  private static canPlaceFromDefinition(
    definition: ReturnType<typeof getPlacementDefinition>,
    context: PlacementContext,
  ): boolean {
    return definition.canPlace(context);
  }

  private static resolveSelectionFromDefinition(
    definition: ReturnType<typeof getPlacementDefinition>,
    context: PlacementContext,
  ): RegisteredResolvedPlacement | null {
    return definition.resolveSelection(context);
  }
}
