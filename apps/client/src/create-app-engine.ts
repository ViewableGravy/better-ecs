import * as Engine from "@repo/engine";
import { Loader } from "./assets";
import { FPSSystem } from "./plugins/fps";
import { Scene as RenderingDemoScene } from "./scenes/rendering-demo";
import { Scene as SpatialContextsDemoScene } from "./scenes/spatial-contexts-demo";
import { Scene as TestScene } from "./scenes/test";
import { System as Collision } from "./systems/collision";
import { System as Initialize } from "./systems/initialisation";
import { System as Movement } from "./systems/movement";
import { System as Physics } from "./systems/physics";
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
      Physics,
      Collision,
    ],
    render: Render,
    scenes: [
      TestScene, 
      RenderingDemoScene, 
      SpatialContextsDemoScene
    ],
  });
};
