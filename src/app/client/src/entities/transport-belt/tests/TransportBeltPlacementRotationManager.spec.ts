import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltPlacementRotationManager } from "@client/entities/transport-belt/placement/TransportBeltPlacementRotationManager";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { UserWorld, World } from "@engine";
import { Transform2D } from "@engine/components";
import { describe, expect, it } from "vitest";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type MatrixCell =
  | "horizontal-right"
  | "horizontal-left"
  | "vertical-up"
  | "vertical-down"
  | "angled-right-up"
  | "angled-up-right"
  | "angled-left-up"
  | "angled-top-left"
  | "angled-bottom-right"
  | "angled-right-bottom"
  | "angled-bottom-left"
  | "angled-left-bottom"
  | null;

type MatrixRow = readonly [MatrixCell, MatrixCell, MatrixCell];
type BeltNeighborMatrix = readonly [MatrixRow, MatrixRow, MatrixRow];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

function createMatrix(
  top: MatrixRow = [null, null, null],
  middle: MatrixRow = [null, null, null],
  bottom: MatrixRow = [null, null, null],
): BeltNeighborMatrix {
  return [top, middle, bottom];
}

describe("TransportBeltPlacementRotationManager", () => {
  it("uses the default straight rotation cycle when no neighbors contribute", () => {
    expect(TransportBeltPlacementRotationManager.resolveRotationCycleFromMatrix(createMatrix())).toEqual([
      "vertical-up",
      "horizontal-right",
      "vertical-down",
      "horizontal-left",
    ]);
  });

  it("uses a left-entry cycle when a west neighbor points into the tile", () => {
    const matrix = createMatrix(
      [null, null, null],
      ["horizontal-right", null, null],
      [null, null, null],
    );

    expect(TransportBeltPlacementRotationManager.resolveRotationCycleFromMatrix(matrix)).toEqual([
      "horizontal-right",
      "angled-left-bottom",
      "horizontal-left",
      "angled-left-up",
    ]);
  });

  it("uses a bottom-entry cycle when a south neighbor points into the tile", () => {
    const matrix = createMatrix(
      [null, null, null],
      [null, null, null],
      [null, "vertical-up", null],
    );

    expect(TransportBeltPlacementRotationManager.resolveRotationCycleFromMatrix(matrix)).toEqual([
      "vertical-up",
      "angled-bottom-right",
      "vertical-down",
      "angled-bottom-left",
    ]);
  });

  it("ignores adjacent belts that do not point into the tile", () => {
    const matrix = createMatrix(
      [null, null, null],
      ["horizontal-left", null, null],
      [null, null, null],
    );

    expect(TransportBeltPlacementRotationManager.resolveRotationCycleFromMatrix(matrix)).toEqual([
      "vertical-up",
      "horizontal-right",
      "vertical-down",
      "horizontal-left",
    ]);
  });

  it("prefers the configured south-then-west precedence when multiple neighbors contribute", () => {
    const matrix = createMatrix(
      [null, "vertical-down", null],
      ["horizontal-right", null, null],
      [null, "vertical-up", null],
    );

    expect(TransportBeltPlacementRotationManager.resolveRotationCycleFromMatrix(matrix)).toEqual([
      "vertical-up",
      "angled-bottom-right",
      "vertical-down",
      "angled-bottom-left",
    ]);
  });

  it("preserves the desired end direction when resolving a world-backed preview variant", () => {
    const world = new UserWorld(new World("scene"));
    const westBeltId = world.create();

    world.add(westBeltId, new Transform2D(-20, 0, 0));
    world.add(westBeltId, new ConveyorBeltComponent("horizontal-right"));

    expect(
      TransportBeltPlacementRotationManager.resolveVariant(
        world,
        GridSingleton.worldToGridCoordinates(0, 0),
        "right",
      ),
    ).toBe("horizontal-right");
  });

  it("changes only the entry shape when the desired end direction stays the same", () => {
    const matrix = createMatrix(
      [null, null, null],
      ["horizontal-right", null, null],
      [null, null, null],
    );

    const cycle = TransportBeltPlacementRotationManager.resolveRotationCycleFromMatrix(matrix);

    expect(cycle).toEqual([
      "horizontal-right",
      "angled-left-bottom",
      "horizontal-left",
      "angled-left-up",
    ]);
  });
});
