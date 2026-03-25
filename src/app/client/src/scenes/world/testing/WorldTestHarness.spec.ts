import { PlayerComponent } from "@client/components/player";
import { OUTSIDE } from "@client/components/render-visibility";
import { spawnBox } from "@client/entities/box";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { WorldTestHarness } from "@client/scenes/world/testing/WorldTestHarness";
import type { LocalPlayerMovementCommandState } from "@client/systems/core/local-player-movement-command/const";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { COLLISION_LAYERS, collides } from "@libs/physics";
import { describe, expect, it } from "vitest";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

describe("WorldTestHarness", () => {
  it("moves the player from deterministic intent without engine input state", async () => {
    const harness = await WorldTestHarness.create();

    harness.movePlayer({ x: 1, y: 0 }, 1000);

    expect(harness.playerPosition()).toEqual({ x: 100, y: 0 });

    const player = harness.world.require(harness.requirePlayerEntityId(), PlayerComponent);

    expect(player.animationState).toBe("moving");
    expect(player.direction).toBe("e");
  });

  it("emits explicit movement commands before movement authority applies them", async () => {
    const harness = await WorldTestHarness.create();

    harness.movePlayer({ x: -1, y: 1 }, 1000);

    const commandState = harness.engine.systems["main:local-player-movement-command"].data as LocalPlayerMovementCommandState;

    expect(commandState.commands).toEqual([
      { type: "movement:move", x: -1, y: 1 },
    ]);
  });

  it("commits and deletes placeables through real build mode command and authority systems", async () => {
    const harness = await WorldTestHarness.create();

    expect(harness.placeItem("land-claim", 100, 0)).toBe(true);
    expect(harness.placeItem("box", 120, 0)).toBe(true);
    expect(harness.placeableCount()).toBe(2);
    expect(harness.findPlaceableAtWorld(120, 0)).toBeDefined();

    const boxCenter = GridSingleton.gridCoordinatesToWorldCenter(
      GridSingleton.worldToGridCoordinates(120, 0),
    );

    harness.deleteAt(boxCenter[0], boxCenter[1]);

    expect(harness.placeableCount()).toBe(1);
    expect(harness.findPlaceableAtWorld(120, 0)).toBeUndefined();
  });

  it("keeps the player separated from solid world geometry after collision systems run", async () => {
    const harness = await WorldTestHarness.create({
      playerStart: {
        x: 10,
        y: 10,
      },
    });

    const boxEntityId = spawnBox(harness.world, {
      snappedX: 0,
      snappedY: 0,
      renderVisibilityRole: OUTSIDE,
    });

    harness.resolveCollision();

    const physicsWorldAfter = PhysicsWorldManager.requireWorld(harness.world);
    const playerBodyAfter = physicsWorldAfter.queryFirstLayer(COLLISION_LAYERS.ACTOR, PlayerComponent);
    const boxBodyAfter = physicsWorldAfter.getBody(boxEntityId);

    expect(playerBodyAfter).toBeDefined();
    expect(boxBodyAfter).toBeDefined();

    if (!playerBodyAfter || !boxBodyAfter) {
      return;
    }

    expect(collides(
      playerBodyAfter.collider,
      playerBodyAfter.transform,
      boxBodyAfter.collider,
      boxBodyAfter.transform,
    )).toBe(false);
  });

  it("keeps the camera centered on the player while real scene systems run", async () => {
    const harness = await WorldTestHarness.create({
      playerStart: {
        x: -40,
        y: 25,
      },
    });

    expect(harness.isCameraCenteredOnPlayer()).toBe(true);

    harness.movePlayer({ x: 1, y: -1 }, 500);
    harness.followCamera();

    expect(harness.cameraPosition()).toEqual(harness.playerPosition());
    expect(harness.isCameraCenteredOnPlayer()).toBe(true);
  });
});