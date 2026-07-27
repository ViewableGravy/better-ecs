import type { MousePoint, Registry } from "@engine";

import type { BuildItemType } from "@legacy/systems/world/build-mode/build-items";
import {
    buildModeStateDefault,
    type BuildModeState,
} from "@legacy/systems/world/build-mode/const";
import {
    GridSingleton,
    type GridCoordinates,
} from "@legacy/systems/world/build-mode/grid-singleton";
import type { PlacementTargetResolution } from "@legacy/systems/world/build-mode/placement-target";
import { PlacementQueries } from "@legacy/systems/world/build-mode/placement/queries";
import {
    canPlaceRegisteredPlacement,
    resolveRegisteredPlacement,
    type RegisteredResolvedPlacement,
} from "@legacy/systems/world/build-mode/placement/registry";
import {
    type PlacementContext,
} from "@legacy/systems/world/build-mode/placement/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class Placement {
  public static deleteAt(world: Registry, worldPointer: MousePoint): void {
    PlacementQueries.deleteAt(world, worldPointer);
  }

  public static deleteAtGrid(world: Registry, gridCoordinates: GridCoordinates): void {
    PlacementQueries.deleteAtGrid(world, gridCoordinates);
  }

  public static canPlaceItem(
    world: Registry,
    gridCoordinates: GridCoordinates,
    selectedItem: BuildItemType,
    buildModeState: BuildModeState = {
      ...buildModeStateDefault,
      selectedItem,
    },
  ): boolean {
    const context = this.createSingleWorldContext(world, gridCoordinates, buildModeState);

    return canPlaceRegisteredPlacement(selectedItem, context);
  }

  public static resolveSelection(
    target: PlacementTargetResolution,
    gridCoordinates: GridCoordinates,
    buildModeState: BuildModeState,
  ): RegisteredResolvedPlacement | null {
    const selectedItem = buildModeState.selectedItem;

    if (selectedItem === null) {
      return null;
    }

    const context = this.createContext(target, gridCoordinates, buildModeState);

    return resolveRegisteredPlacement(selectedItem, context);
  }

  public static resolveSelectionBatch(
    target: PlacementTargetResolution,
    gridCoordinatesBatch: readonly GridCoordinates[],
    buildModeState: BuildModeState,
  ): RegisteredResolvedPlacement[] {
    const selectedItem = buildModeState.selectedItem;

    if (selectedItem === null || gridCoordinatesBatch.length === 0) {
      return [];
    }

    const placements: RegisteredResolvedPlacement[] = [];

    for (const gridCoordinates of gridCoordinatesBatch) {
      const context = this.createContext(target, gridCoordinates, buildModeState);
      const resolvedPlacement = resolveRegisteredPlacement(selectedItem, context);

      if (resolvedPlacement === null) {
        continue;
      }

      placements.push(resolvedPlacement);
    }

    return placements;
  }

  private static createSingleWorldContext(
    world: Registry,
    gridCoordinates: GridCoordinates,
    buildModeState: BuildModeState,
  ): PlacementContext {
    return this.createContext({
      inputWorld: world,
      focusedWorld: world,
      previewWorld: world,
      commitWorld: world,
    }, gridCoordinates, buildModeState);
  }

  private static createContext(
    target: Pick<
      PlacementTargetResolution,
      | "inputWorld"
      | "focusedWorld"
      | "previewWorld"
      | "commitWorld"
    >,
    gridCoordinates: GridCoordinates,
    buildModeState: BuildModeState,
  ): PlacementContext {
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(gridCoordinates);
    const commitWorld = target.commitWorld ?? target.focusedWorld;

    return {
      world: commitWorld,
      inputWorld: target.inputWorld,
      focusedWorld: target.focusedWorld,
      previewWorld: target.previewWorld,
      commitWorld,
      gridCoordinates,
      snappedX,
      snappedY,
      buildModeState,
    };
  }

}
