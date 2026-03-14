import type { MousePoint, UserWorld } from "@engine";

import type { BuildItemType } from "@client/systems/world/build-mode/build-items";
import {
    buildModeStateDefault,
    type BuildModeState,
} from "@client/systems/world/build-mode/const";
import {
    GridSingleton,
    type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";
import type { PlacementTargetResolution } from "@client/systems/world/build-mode/placement-target";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";
import {
    canPlaceRegisteredPlacement,
    resolveRegisteredPlacement,
    type RegisteredResolvedPlacement,
} from "@client/systems/world/build-mode/placement/registry";
import {
    type PlacementContext,
} from "@client/systems/world/build-mode/placement/types";

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
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    buildModeState: BuildModeState,
  ): PlacementContext {
    return this.createContext({
      inputWorld: world,
      focusedWorld: world,
      previewWorld: world,
      previewContextId: undefined,
      commitContextId: undefined,
      commitWorld: world,
      relationship: undefined,
    }, gridCoordinates, buildModeState);
  }

  private static createContext(
    target: Pick<
      PlacementTargetResolution,
      | "inputWorld"
      | "focusedWorld"
      | "previewWorld"
      | "previewContextId"
      | "commitContextId"
      | "relationship"
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
      previewContextId: target.previewContextId,
      commitContextId: target.commitContextId,
      relationship: target.relationship,
      gridCoordinates,
      snappedX,
      snappedY,
      buildModeState,
    };
  }

}
