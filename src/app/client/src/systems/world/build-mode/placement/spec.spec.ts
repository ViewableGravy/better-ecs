import { spawnBox } from "@client/entities/box";
import { BoxGhost } from "@client/entities/box/ghost";
import { spawnLandClaim } from "@client/entities/land-claim";
import {
    LAND_CLAIM_OWNER_NAME,
} from "@client/entities/land-claim/const";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import {
    buildModeStateDefault,
} from "@client/systems/world/build-mode/const";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { createGhostPreviewAdapter } from "@client/systems/world/build-mode/placement/preview";
import { createBuildItemSpec } from "@client/systems/world/build-mode/placement/spec";
import type { PlacementContext } from "@client/systems/world/build-mode/placement/types";
import { Registry } from "@engine";
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

describe("createBuildItemSpec", () => {
  it("checks every occupied footprint cell when using the default placement rules", () => {
    const world = new Registry();
    const anchorCoordinates = GridSingleton.worldToGridCoordinates(0, 0);
    const [claimSnappedX, claimSnappedY] = GridSingleton.gridCoordinatesToWorldOrigin(anchorCoordinates);
    const occupiedCoordinates = GridSingleton.worldToGridCoordinates(20, 0);
    const [occupiedSnappedX, occupiedSnappedY] = GridSingleton.gridCoordinatesToWorldOrigin(occupiedCoordinates);

    const definition = createBuildItemSpec({
      item: "box",
      preview: createGhostPreviewAdapter(BoxGhost),
      placement: {
        footprint: {
          width: 2,
          height: 1,
        },
      },
      lifecycle: {
        commit() {
          return undefined;
        },
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

    expect(definition.canPlace(
      createPlacementContext(world, anchorCoordinates, claimSnappedX, claimSnappedY),
    )).toBe(false);
  });
});