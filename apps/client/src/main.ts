// apps/client/src/main.ts
import * as Engine from "@repo/engine";
import { System as FPSCounter, SpatialContextsRuntimeSystem } from "@repo/plugins";
import { Loader } from "./assets";
import { Scene as RenderingDemoScene } from "./scenes/rendering-demo";
import { Scene as SpatialContextsDemoScene } from "./scenes/spatial-contexts-demo";
import { Scene as TestScene } from "./scenes/test";
import "./styles.css";
import { System as Collision } from "./systems/collision";
import { System as Initialize } from "./systems/initialisation";
import { System as Movement } from "./systems/movement";
import { System as Physics } from "./systems/physics";
import { System as Render } from "./systems/render";
import { invariantById } from "./utilities/selectors";

declare module "@repo/engine" {
  interface Register {
    Engine: Awaited<ReturnType<typeof main>>;
  }
}

async function main() {
  const engine = Engine.createEngine({
    assetLoader: Loader,
    initialization: Initialize,
    systems: [
      // Plugins
      FPSCounter({
        element: invariantById("fps-counter"),
        round: true,
        rate: 1000,
        modeToggleKey: {
          code: "KeyF",
          modifiers: {
            ctrl: true,
            shift: true,
          },
        },
      }),

      // Spatial contexts runtime (binds focused context to engine.world)
      SpatialContextsRuntimeSystem,

      // Update systems
      Movement,
      Physics,
      Collision,

      // Render system
      Render,
    ],
    scenes: [TestScene, RenderingDemoScene, SpatialContextsDemoScene],
  });

  // Start application
  // prettier-ignore
  for await (const [update, frame] of engine.startEngine({ fps: 60, ups: 10 })) {
    if (update.shouldUpdate) {
      // Update phase - run update logic
    }

    if (frame.shouldUpdate) {
      // Render phase - run render logic
    }
  }

  // Return engine for type registration
  return engine;
}

main();
