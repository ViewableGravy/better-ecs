import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { EntityId, MousePoint, UserWorld } from "@engine";

import {
    buildModeStateDefault,
    type BuildItemType,
    type BuildModeState,
} from "@client/systems/world/build-mode/const";
import { GhostPreviewManager } from "@client/systems/world/build-mode/ghost-preview-manager";
import {
    GridSingleton,
    type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";
import { boxPlacementDefinition } from "@client/systems/world/build-mode/placement/box";
import {
    type PlacementContext,
    type PlacementDefinition,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import { landClaimPlacementDefinition } from "@client/systems/world/build-mode/placement/land-claim";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";
import { transportBeltPlacementDefinition } from "@client/systems/world/build-mode/placement/transport-belt";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type ResolvedPlacement = {
  item: BuildItemType;
  canPlace: boolean;
  spawn: (renderVisibilityRole: RenderVisibilityRole) => void;
  syncGhost: (world: UserWorld, ghostEntityId: EntityId | null) => EntityId;
};

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

    if (selectedItem === "box") {
      return this.canPlaceFromDefinition(boxPlacementDefinition, context);
    }

    if (selectedItem === "land-claim") {
      return this.canPlaceFromDefinition(landClaimPlacementDefinition, context);
    }

    return this.canPlaceFromDefinition(transportBeltPlacementDefinition, context);
  }

  public static resolveSelection(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    buildModeState: BuildModeState,
  ): ResolvedPlacement | null {
    const selectedItem = buildModeState.selectedItem;

    if (selectedItem === null) {
      return null;
    }

    const context = this.createContext(world, gridCoordinates, buildModeState);

    if (selectedItem === "box") {
      return this.resolveSelectionFromDefinition(boxPlacementDefinition, context);
    }

    if (selectedItem === "land-claim") {
      return this.resolveSelectionFromDefinition(landClaimPlacementDefinition, context);
    }

    return this.resolveSelectionFromDefinition(transportBeltPlacementDefinition, context);
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

  private static canPlaceFromDefinition<TPayload>(
    definition: PlacementDefinition<TPayload, EntityId>,
    context: PlacementContext,
  ): boolean {
    const payload = definition.resolvePayload?.(context);

    if (payload === null) {
      return false;
    }

    return definition.canPlace(context, payload);
  }

  private static resolveSelectionFromDefinition<TPayload>(
    definition: PlacementDefinition<TPayload, EntityId>,
    context: PlacementContext,
  ): ResolvedPlacement | null {
    const payload = definition.resolvePayload?.(context);

    if (payload === null) {
      return null;
    }

    const canPlace = definition.canPlace(context, payload);

    return {
      item: definition.item,
      canPlace,
      spawn(renderVisibilityRole) {
        definition.spawn({ ...context, renderVisibilityRole }, payload);
      },
      syncGhost(world, ghostEntityId) {
        return GhostPreviewManager.sync(
          world,
          ghostEntityId,
          context.snappedX,
          context.snappedY,
          definition.ghost,
          payload,
          canPlace,
        );
      },
    };
  }
}
