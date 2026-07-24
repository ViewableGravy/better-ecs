import { spawnBox } from "@client/entities/box";
import { GhostPreviewComponent } from "@client/entities/ghost";
import { spawnLandClaim } from "@client/entities/land-claim";
import {
    LAND_CLAIM_OWNER_NAME,
} from "@client/entities/land-claim/const";
import { spawnTransportBelt } from "@client/entities/transport-belt";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { Placeable } from "@client/systems/world/build-mode/components/placeable";
import { buildModeStateDefault } from "@client/systems/world/build-mode/const";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { Placement } from "@client/systems/world/build-mode/placement";
import { Registry } from "@engine";
import { describe, expect, it } from "vitest";

describe("Placement", () => {
  it("restricts regular placement to claim buildable territory", () => {
    const world = new Registry();
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(
      GridSingleton.worldToGridCoordinates(0, 0),
    );

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(20, 0), "box")).toBe(false);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(20, 0), "wall")).toBe(false);

    spawnLandClaim(world, {
      snappedX,
      snappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
    });

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(20, 0), "box")).toBe(true);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(20, 0), "wall")).toBe(true);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(280, 0), "transport-belt")).toBe(true);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(300, 0), "box")).toBe(false);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(300, 0), "wall")).toBe(false);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(300, 0), "transport-belt")).toBe(false);
  });

  it("keeps land claims placeable outside existing claim territory when the tile is empty", () => {
    const world = new Registry();
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(
      GridSingleton.worldToGridCoordinates(0, 0),
    );

    spawnLandClaim(world, {
      snappedX,
      snappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
    });

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(400, 0), "land-claim")).toBe(true);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(0, 0), "land-claim")).toBe(false);
  });

  it("allows belts to replace conveyors on the same grid cell", () => {
    const world = new Registry();
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(
      GridSingleton.worldToGridCoordinates(0, 0),
    );
    const targetCoordinates = GridSingleton.worldToGridCoordinates(20, 0);
    const [targetCenterX, targetCenterY] = GridSingleton.gridCoordinatesToWorldCenter(targetCoordinates);

    spawnLandClaim(world, {
      snappedX,
      snappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
    });
    spawnTransportBelt(world, { x: targetCenterX, y: targetCenterY, variant: "horizontal-right" });

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, targetCoordinates, "transport-belt")).toBe(true);
  });

  it("blocks belts from replacing solid occupants by default", () => {
    const world = new Registry();
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(
      GridSingleton.worldToGridCoordinates(0, 0),
    );
    const targetCoordinates = GridSingleton.worldToGridCoordinates(20, 0);
    const [targetSnappedX, targetSnappedY] = GridSingleton.gridCoordinatesToWorldOrigin(targetCoordinates);

    spawnLandClaim(world, {
      snappedX,
      snappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
    });
    spawnBox(world, {
      snappedX: targetSnappedX,
      snappedY: targetSnappedY,
    });

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, targetCoordinates, "transport-belt")).toBe(false);
  });

  it("keeps preview and commit worlds explicit on the resolved placement", () => {
    const previewWorld = new Registry();
    const commitWorld = new Registry();
    const gridCoordinates = GridSingleton.worldToGridCoordinates(0, 0);
    const resolvedPlacement = Placement.resolveSelection({
      inputWorld: previewWorld,
      focusedWorld: previewWorld,
      previewWorld,
      commitWorld,
      blocked: false,
    }, gridCoordinates, {
      ...buildModeStateDefault,
      selectedItem: "land-claim",
    });

    expect(resolvedPlacement).not.toBeNull();

    if (resolvedPlacement === null) {
      return;
    }

    const ghostEntityId = resolvedPlacement.preview.sync(null, "local-player");

    expect(resolvedPlacement.preview.world).toBe(previewWorld);
    expect(resolvedPlacement.commit.world).toBe(commitWorld);
    expect(previewWorld.has(ghostEntityId, GhostPreviewComponent)).toBe(true);
    expect(commitWorld.query(Placeable)).toHaveLength(0);

    resolvedPlacement.commit.execute();

    expect(commitWorld.query(Placeable)).toHaveLength(1);
    expect(previewWorld.query(Placeable)).toHaveLength(0);
  });
});
