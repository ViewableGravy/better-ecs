import { Loader } from "@client/assets";
import { createAppEngineLoadingOverlay } from "@client/overlays/create-app-engine-overlays";
import { FPSSystem } from "@client/plugins/fps";
import { PhysicsDebugSystem } from "@client/plugins/physics";
import { Render } from "@client/render";
import { Scene as BenchmarkScene } from "@client/scenes/benchmark";
import { Scene as E2eScene } from "@client/scenes/e2e";
import { Scene as MainScene } from "@client/scenes/world";
import { System as CameraFollow } from "@client/systems/core/camera-follow";
import { System as CameraZoom } from "@client/systems/core/camera-zoom";
import { System as Initialize } from "@client/systems/core/initialisation";
import { System as Movement } from "@client/systems/core/movement";
import { System as PhysicsWorldSync } from "@client/systems/core/physics-world-sync";
import { System as TempAutoSavePlayerPosition } from "@client/systems/core/temp-auto-save";
import { System as ConveyorMovement } from "@client/systems/world/conveyor-movement";
import { System as Collision } from "@client/systems/world/scene-collision";
import { invariantById } from "@client/utilities/selectors";
import * as Engine from "@engine";

export const createAppEngine = () => {
  const rootElement = invariantById<HTMLDivElement>("game");

  // prettier-ignore
  return Engine.createEngine({
    rootElement,
    assetLoader: Loader,
    loading: createAppEngineLoadingOverlay(),
    initialization: Initialize,
    systems: [
      // Plugins
      FPSSystem,
      // Update systems
      TempAutoSavePlayerPosition,
      Movement,
      PhysicsWorldSync,
      ConveyorMovement,
      Collision,
      CameraFollow,
      CameraZoom,

      // Keep collider proxy sync after movement/collision so prev/curr are interpolation-ready.
      PhysicsDebugSystem,
    ],
    render: Render,
    scenes: [
      MainScene,
      E2eScene,
      BenchmarkScene,
    ],
    config: {
      render: {
        culling: {
          enabled: true,
          viewportScaleX: 0.95,
          viewportScaleY: 0.95,
          debugOutline: false,
        },
      },
    },
  });
};
