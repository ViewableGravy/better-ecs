import * as Engine from "@repo/engine";
import { Loader } from "./assets";
import { FPSSystem } from "./plugins/fps";
import { PhysicsDebugSystem } from "./plugins/physics";
import { Scene as E2eScene } from "./scenes/e2e";
import { Scene as MainScene } from "./scenes/spatial-contexts-demo";
import { System as Collision } from "./scenes/spatial-contexts-demo/systems/scene-collision.system";
import { System as CameraFollow } from "./systems/camera-follow";
import { System as CameraZoom } from "./systems/camera-zoom";
import { System as Initialize } from "./systems/initialisation";
import { System as Movement } from "./systems/movement";
import { Render } from "./systems/render";
import { invariantById } from "./utilities/selectors";

export const createAppEngine = () => {
  const canvas = invariantById<HTMLCanvasElement>("game");

  // prettier-ignore
  return Engine.createEngine({
    canvas,
    assetLoader: Loader,
    initialization: Initialize,
    systems: [
      // Plugins
      FPSSystem,
      // Update systems
      Movement,
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
  });
};
