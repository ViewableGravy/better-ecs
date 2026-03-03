import * as Engine from "@engine";
import { Loader } from "@client/assets";
import { FPSSystem } from "@client/plugins/fps";
import { PhysicsDebugSystem } from "@client/plugins/physics";
import { Render } from "@client/render";
import { Scene as E2eScene } from "@client/scenes/e2e";
import { Scene as MainScene } from "@client/scenes/world";
import { System as Collision } from "@client/scenes/world/systems/scene-collision.system";
import { System as CameraFollow } from "@client/systems/camera-follow";
import { System as CameraZoom } from "@client/systems/camera-zoom";
import { System as Initialize } from "@client/systems/initialisation";
import { System as Movement } from "@client/systems/movement";
import { System as PhysicsWorldSync } from "@client/systems/physics-world-sync";
import { System as TempAutoSavePlayerPosition } from "@client/systems/temp-auto-save";
import { invariantById } from "@client/utilities/selectors";

export const createAppEngine = () => {
  const rootElement = invariantById<HTMLDivElement>("game");

  // prettier-ignore
  return Engine.createEngine({
    rootElement,
    assetLoader: Loader,
    initialization: Initialize,
    systems: [
      // Plugins
      FPSSystem,
      // Update systems
      TempAutoSavePlayerPosition,
      Movement,
      PhysicsWorldSync,
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
