import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { spawnBox } from "@client/entities/box";
import { spawnLandClaim } from "@client/entities/land-claim";
import {
    LAND_CLAIM_OWNER_NAME,
} from "@client/entities/land-claim/const";
import { spawnTransportBelt } from "@client/entities/transport-belt";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import {
    buildModeStateDefault,
} from "@client/systems/world/build-mode/const";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import {
    createPlacementEvaluator,
} from "@client/systems/world/build-mode/placement/rules";
import type { PlacementContext } from "@client/systems/world/build-mode/placement/types";
import { Registry } from "@engine";
import { COLLISION_LAYERS } from "@libs/physics";
import { describe, expect, it } from "vitest";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

function createPlacementContext(
  world: Registry,
  gridCoordinates: ReturnType<typeof GridSingleton.worldToGridCoordinates>,
  snappedX: number,
  snappedY: number,
): PlacementContext {
  return {
    world,
    inputWorld: world,
    focusedWorld: world,
    previewWorld: world,
    commitWorld: world,
    gridCoordinates,
    snappedX,
    snappedY,
    buildModeState: buildModeStateDefault,
  };
}

describe("placement rules", () => {
  it("checks every occupied footprint cell and reports staged evaluation details", () => {
    const world = new Registry();
    const anchorCoordinates = GridSingleton.worldToGridCoordinates(0, 0);
    const [claimSnappedX, claimSnappedY] = GridSingleton.gridCoordinatesToWorldOrigin(anchorCoordinates);
    const occupiedCoordinates = GridSingleton.worldToGridCoordinates(20, 0);
    const [occupiedSnappedX, occupiedSnappedY] = GridSingleton.gridCoordinatesToWorldOrigin(occupiedCoordinates);

    const evaluatePlacement = createPlacementEvaluator({
      item: "box",
      footprint: {
        width: 2,
        height: 1,
      },
    });

    spawnLandClaim(world, {
      snappedX: claimSnappedX,
      snappedY: claimSnappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
    });
    spawnBox(world, {
      snappedX: occupiedSnappedX,
      snappedY: occupiedSnappedY,
    });

    PhysicsWorldManager.beginFrame([world]);

    const evaluation = evaluatePlacement(
      createPlacementContext(world, anchorCoordinates, claimSnappedX, claimSnappedY),
    );

    expect(evaluation.cells).toHaveLength(2);
    expect(evaluation.cells[0]?.isBuildable).toBe(true);
    expect(evaluation.cells[0]?.occupants).toHaveLength(1);
    expect(evaluation.cells[1]?.occupants).toHaveLength(1);
    expect(evaluation.occupants).toHaveLength(2);
    expect(evaluation.occupancyPassed).toBe(false);
    expect(evaluation.canPlace).toBe(false);
  });

  it("reports replacement targets when replace-compatible occupants are allowed", () => {
    const world = new Registry();
    const anchorCoordinates = GridSingleton.worldToGridCoordinates(0, 0);
    const [claimSnappedX, claimSnappedY] = GridSingleton.gridCoordinatesToWorldOrigin(anchorCoordinates);
    const beltCoordinates = GridSingleton.worldToGridCoordinates(20, 0);
    const [beltCenterX, beltCenterY] = GridSingleton.gridCoordinatesToWorldCenter(beltCoordinates);

    const evaluatePlacement = createPlacementEvaluator({
      item: "transport-belt",
      placementStrategy: {
        queries: ["grid", "overlap"],
        strategy: "replace",
        compatibilityGroup: "transport-belt",
        resolveOccupantCompatibilityGroup(world, occupant) {
          return world.has(occupant.entityId, ConveyorBeltComponent) ? "transport-belt" : null;
        },
        replaceableLayers: COLLISION_LAYERS.CONVEYOR,
      },
    });

    spawnLandClaim(world, {
      snappedX: claimSnappedX,
      snappedY: claimSnappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
    });
    spawnTransportBelt(world, {
      x: beltCenterX,
      y: beltCenterY,
      variant: "horizontal-right",
    });

    PhysicsWorldManager.beginFrame([world]);

    const evaluation = evaluatePlacement(
      createPlacementContext(world, beltCoordinates, beltCenterX - 10, beltCenterY - 10),
    );

    expect(evaluation.occupancyPassed).toBe(true);
    expect(evaluation.replacementTargets).toHaveLength(1);
    expect(evaluation.canPlace).toBe(true);
  });
});