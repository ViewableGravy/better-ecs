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
    const hoveredCoordinates = coordinates(0, 0);

    expect(BuildModeDragPlacement.resolvePlacementBatch(state, hoveredCoordinates)).toEqual({
      mode: "line",
      axis: null,
      anchor: null,
      hovered: hoveredCoordinates,
      candidates: [hoveredCoordinates],
    });
  });

  it("fills the full unplaced horizontal path between the anchor and hover tile", () => {
    const state = createState({
      selectedItem: "transport-belt",
      placePointerActive: true,
      placementEndSide: "right",
    });

    BuildModeDragPlacement.recordPlacement(state, coordinates(0, 0));

    expect(BuildModeDragPlacement.resolvePlacementBatch(state, coordinates(60, 0))).toEqual({
      mode: "line",
      axis: "horizontal",
      anchor: coordinates(0, 0),
      hovered: coordinates(60, 0),
      candidates: [
        coordinates(20, 0),
        coordinates(40, 0),
        coordinates(60, 0),
      ],
    });

    expect(BuildModeDragPlacement.resolvePlacementBatch(state, coordinates(20, 20)).candidates).toEqual([]);
  });

  it("skips already placed tiles while continuing the horizontal drag line", () => {
    const state = createState({
      selectedItem: "transport-belt",
      placePointerActive: true,
      placementEndSide: "right",
    });

    BuildModeDragPlacement.recordPlacement(state, coordinates(0, 0));
    BuildModeDragPlacement.recordPlacement(state, coordinates(20, 0));

    expect(BuildModeDragPlacement.resolvePlacementBatch(state, coordinates(60, 0)).candidates).toEqual([
      coordinates(40, 0),
      coordinates(60, 0),
    ]);
  });

  it("fills the full unplaced vertical path when dragging back past the anchor", () => {
    const state = createState({
      selectedItem: "transport-belt",
      placePointerActive: true,
      placementEndSide: "bottom",
    });

    BuildModeDragPlacement.recordPlacement(state, coordinates(0, 0));

    expect(BuildModeDragPlacement.resolvePlacementBatch(state, coordinates(0, -40))).toEqual({
      mode: "line",
      axis: "vertical",
      anchor: coordinates(0, 0),
      hovered: coordinates(0, -40),
      candidates: [
        coordinates(0, -20),
        coordinates(0, -40),
      ],
    });
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

function coordinates(x: number, y: number) {
  return GridSingleton.worldToGridCoordinates(x, y);
}