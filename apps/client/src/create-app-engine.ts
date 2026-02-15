import * as Engine from "@repo/engine";
import { Loader } from "./assets";
import { FPSSystem } from "./plugins/fps";
import { Scene as RenderingDemoScene } from "./scenes/rendering-demo";
import { Scene as SpatialContextsDemoScene } from "./scenes/spatial-contexts-demo";
import { System as Collision } from "./scenes/spatial-contexts-demo/systems/scene-collision.system";
import { Scene as TestScene } from "./scenes/test";
import { System as BuildMode } from "./systems/build-mode";
import { System as CameraFollow } from "./systems/camera-follow";
import { System as CameraZoom } from "./systems/camera-zoom";
import { System as Initialize } from "./systems/initialisation";
import { System as Movement } from "./systems/movement";
import { Render } from "./systems/render";

export const createAppEngine = () => {
  // prettier-ignore
  return Engine.createEngine({
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
      BuildMode,
    ],
    render: Render,
    scenes: [
      TestScene, 
      RenderingDemoScene, 
      SpatialContextsDemoScene
    ],
  });
};
