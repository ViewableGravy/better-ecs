import {
  buildModeStateDefault,
  type BuildModeState,
} from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { describe, expect, it } from "vitest";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

describe("BuildModeDragPlacement", () => {
  it("starts placing belts on the first hovered tile while the pointer is held", () => {
    const state = createState({
      selectedItem: "transport-belt",
      placePointerActive: true,
    });
    const hoveredCoordinates = GridSingleton.worldToGridCoordinates(0, 0);

    expect(BuildModeDragPlacement.resolvePlacementCandidates(state, hoveredCoordinates)).toEqual([hoveredCoordinates]);
  });

  it("continues placement only on the hovered aligned horizontal tile", () => {
    const state = createState({
      selectedItem: "transport-belt",
      placePointerActive: true,
      placementEndSide: "right",
    });

    BuildModeDragPlacement.recordPlacement(state, GridSingleton.worldToGridCoordinates(0, 0));
    BuildModeDragPlacement.recordPlacement(state, GridSingleton.worldToGridCoordinates(20, 0));

    expect(BuildModeDragPlacement.resolvePlacementCandidates(state, GridSingleton.worldToGridCoordinates(60, 0))).toEqual([
      GridSingleton.worldToGridCoordinates(60, 0),
    ]);

    expect(BuildModeDragPlacement.resolvePlacementCandidates(state, GridSingleton.worldToGridCoordinates(20, 20))).toEqual([]);
  });

  it("resets the drag session when the pointer is no longer held", () => {
    const state = createState({
      selectedItem: "transport-belt",
      placePointerActive: true,
      placementEndSide: "bottom",
    });

    BuildModeDragPlacement.recordPlacement(state, GridSingleton.worldToGridCoordinates(0, 0));
    state.placePointerActive = false;

    BuildModeDragPlacement.syncSession(state);

    expect(state.dragPlacementAxis).toBeNull();
    expect(state.dragPlacementAnchorGridX).toBeNull();
    expect(state.dragPlacementAnchorGridY).toBeNull();
    expect(state.dragPlacedGridKeys).toEqual([]);
  });
});

function createState(overrides: Partial<BuildModeState>): BuildModeState {
  return {
    ...buildModeStateDefault,
    ...overrides,
    dragPlacedGridKeys: overrides.dragPlacedGridKeys ?? [],
  };
}