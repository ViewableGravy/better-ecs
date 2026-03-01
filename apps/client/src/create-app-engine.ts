import * as Engine from "@repo/engine";
import { Loader } from "./assets";
import { FPSSystem } from "./plugins/fps";
import { PhysicsDebugSystem } from "./plugins/physics";
import { Render } from "./render";
import { Scene as E2eScene } from "./scenes/e2e";
import { Scene as MainScene } from "./scenes/world";
import { System as Collision } from "./scenes/world/systems/scene-collision.system";
import { System as CameraFollow } from "./systems/camera-follow";
import { System as CameraZoom } from "./systems/camera-zoom";
import { System as Initialize } from "./systems/initialisation";
import { System as Movement } from "./systems/movement";
import { System as TempAutoSavePlayerPosition } from "./systems/temp-auto-save";
import { invariantById } from "./utilities/selectors";

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
      Collision,
      CameraFollow,
      CameraZoom,

      // Keep collider proxy sync after movement/collision so prev/curr are interpolation-ready.
      PhysicsDebugSystem,
    ],
    render: Render,
    renderCulling: {
      enabled: true,
      viewportScaleX: 0.95,
      viewportScaleY: 0.95,
      debugOutline: false,
    },
    scenes: [
      MainScene,
      E2eScene,
    ],
  });
};
