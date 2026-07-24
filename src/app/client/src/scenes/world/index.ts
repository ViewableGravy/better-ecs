import { createDomLoadingOverlay } from "@client/overlays/create-dom-loading-overlay";
import { FPSSystem } from "@client/plugins/fps";
import { PhysicsDebugSystem } from "@client/plugins/physics";
import { sceneConfig } from "@client/scenes/world/const";
import { setupDungeon } from "@client/scenes/world/contexts/define-dungeon-context";
import { setupHouse } from "@client/scenes/world/contexts/define-house-context";
import { setupOverworld } from "@client/scenes/world/contexts/define-overworld-context";
import { setupSceneArea } from "@client/scenes/world/contexts/shared";
import { System as CameraFollow } from "@client/systems/core/camera-follow";
import { System as CameraZoom } from "@client/systems/core/camera-zoom";
import { System as CommandAllocatorReset } from "@client/systems/core/command-allocator-reset";
import { System as LocalPlayerMovementCommand } from "@client/systems/core/local-player-movement-command";
import { System as LocalPlayerMovementIntent } from "@client/systems/core/local-player-movement-intent";
import { System as MovementAuthority } from "@client/systems/core/movement";
import { System as PhysicsWorldSync } from "@client/systems/core/physics-world-sync";
import { System as BuildModeIntentSystem } from "@client/systems/world/build-mode";
import { System as BuildModeAuthoritySystem } from "@client/systems/world/build-mode-authority";
import { System as BuildModeCommandSystem } from "@client/systems/world/build-mode-command";
import { System as BuildModePresentationSystem } from "@client/systems/world/build-mode-presentation";
import { System as ConveyorEntityMotion } from "@client/systems/world/conveyor-entity-motion";
import { System as ConveyorMovement } from "@client/systems/world/conveyor-movement";
import { PlayerOrbitSystem } from "@client/systems/world/player-orbit";
import { System as PortalSystem } from "@client/systems/world/portal";
import { System as Collision } from "@client/systems/world/scene-collision";
import { createScene } from "@engine";
import { ActiveRegistry, fromContext, FromEngine } from "@engine/context";

export const Scene = createScene("MainScene")({
  loading: createDomLoadingOverlay({
    id: "scene-loading-overlay-main",
    message: "Loading Main Scene...",
    zIndex: 10001,
    scope: "canvas-parent",
  }),
  systems: [
    // Support Systems
    CommandAllocatorReset,
    PhysicsWorldSync,
    FPSSystem,

    // Intent Systems
    LocalPlayerMovementIntent,
    BuildModeIntentSystem,

    // Command Systems
    LocalPlayerMovementCommand,
    BuildModeCommandSystem,

    // Authority Systems
    MovementAuthority,
    ConveyorEntityMotion,
    ConveyorMovement,
    PortalSystem,
    Collision,
    BuildModeAuthoritySystem,

    // Local Presentation Systems
    CameraFollow,
    CameraZoom,
    PhysicsDebugSystem,
    PlayerOrbitSystem,
    BuildModePresentationSystem,
  ],
  async setup() {
    const registry = fromContext(ActiveRegistry);
    const { areaOrigins, house } = sceneConfig;

    setupSceneArea(registry, areaOrigins.overworld, (areaRegistry) => {
      setupOverworld(areaRegistry, {
        houseHalfWidth: house.halfWidth,
        houseHalfHeight: house.halfHeight,
        houseDestination: {
          x: areaOrigins.house.x,
          y: areaOrigins.house.y + house.halfHeight - 30,
        },
        dungeonDestination: {
          x: areaOrigins.dungeon.x,
          y: areaOrigins.dungeon.y + 160,
        },
      });
    });
    setupSceneArea(registry, areaOrigins.house, (areaRegistry) => {
      setupHouse(areaRegistry, {
        houseHalfWidth: house.halfWidth,
        houseHalfHeight: house.halfHeight,
        overworldDestination: {
          x: areaOrigins.overworld.x,
          y: areaOrigins.overworld.y + house.halfHeight + 35,
        },
        dungeonDestination: {
          x: areaOrigins.dungeon.x,
          y: areaOrigins.dungeon.y + 160,
        },
      });
    });
    setupSceneArea(registry, areaOrigins.dungeon, (areaRegistry) => {
      setupDungeon(areaRegistry, {
        overworldDestination: {
          x: areaOrigins.overworld.x,
          y: areaOrigins.overworld.y + 40,
        },
      });
    });

    const assets = fromContext(FromEngine.Assets);

    await new Promise((resolve) => setTimeout(resolve, 500)); // artificial delay to show loading overlay

    await assets.loadSheet("player-idle");
    await assets.loadSheet("player-moving");
    await assets.loadSheet("iron-gear");
    await assets.loadSheet("transport-belt");
    await assets.loadSheet("wall-single");
    await assets.loadSheet("wall-ending-left");
    await assets.loadSheet("wall-ending-right");
    await assets.loadSheet("wall-horizontal");
    await assets.load("land-claim:viewable-gravy-nameplate");
  },
});
