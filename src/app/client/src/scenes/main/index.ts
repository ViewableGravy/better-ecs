import { spawnCamera } from "@client/entities/camera";
import { spawnChest } from "@client/entities/chest";
import { spawnPlayer } from "@client/entities/player";
import { spawnTree } from "@client/entities/tree";
import { createDomLoadingOverlay } from "@client/overlays/create-dom-loading-overlay";
import { FPSSystem } from "@client/plugins/fps";
import { PhysicsDebugSystem } from "@client/plugins/physics";
import { CameraFollow } from "@client/systems/camera-follow";
import { CameraZoom } from "@client/systems/camera-zoom";
import { PhysicsWorldSync } from "@client/systems/physics-world-sync";
import { PlayerCollision } from "@client/systems/player-collision";
import { PlayerMovement } from "@client/systems/player-movement";
import { PlayerMovementIntent } from "@client/systems/player-movement/intent";
import { Grid } from "@client/utilities/grid";
import { createScene } from "@engine";
import { ActiveRegistry, FromEngine, fromContext } from "@engine/context";

export const Scene = createScene("MainScene")({
  loading: createDomLoadingOverlay({
    id: "scene-loading-overlay-main",
    message: "Loading scene...",
    zIndex: 10001,
    scope: "canvas-parent",
  }),
  systems: [
    PhysicsWorldSync,
    FPSSystem,
    PlayerMovementIntent,
    PlayerMovement,
    PlayerCollision,
    CameraFollow,
    CameraZoom,
    PhysicsDebugSystem,
  ],
  async setup() {
    const assets = fromContext(FromEngine.Assets);
    const world = fromContext(ActiveRegistry);

    await Promise.all([
      assets.loadSheet("wooden-chest"),
      assets.loadSheet("player-idle"),
      assets.loadSheet("player-moving"),
      assets.loadSheet("transport-belt"),
    ]);

    // Load Terrain
    Grid.initialize()
      .setRadius(20)
      .setOutlineDebugging(true);

    // Spawn Entities
    spawnPlayer(world);
    spawnCamera(world);
    spawnTree(world, 100, 40);
    spawnChest(world, 100, -20);
  },
});
