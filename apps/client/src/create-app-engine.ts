import * as Engine from "@repo/engine";
import { Loader } from "./assets";
import { FPSSystem } from "./plugins/fps";
import { Scene as RenderingDemoScene } from "./scenes/rendering-demo";
import { Scene as SpatialContextsDemoScene } from "./scenes/spatial-contexts-demo";
import { Scene as TestScene } from "./scenes/test";
import { System as CameraFollow } from "./systems/camera-follow";
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
      CameraFollow,
    ],
    render: Render,
    scenes: [
      TestScene, 
      RenderingDemoScene, 
      SpatialContextsDemoScene
    ],
  });
};
