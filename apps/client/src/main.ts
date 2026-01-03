// apps/client/src/main.ts
import * as Engine from "@repo/engine";
import { System as Collision } from './systems/collision';
import { System as Initialize } from "./systems/initialisation";
import { System as Input } from './systems/input';
import { System as Movement } from './systems/movement';
import { System as Physics } from './systems/physics';
import { System as Render } from './systems/render';

// Register the engine type with the module for useEngine() typing
declare module "@repo/engine" {
  interface Register {
    Engine: Awaited<ReturnType<typeof main>>;
  }
}

async function main() {
  const engine = Engine.createEngine({
    initialization: Initialize,
    systems: [
      // Update systems
      Input,
      Movement,
      Physics,
      Collision,

      // Render systems
      Render,
    ]
  });

  // Start application
  for await (const [update, frame] of engine.startEngine({ fps: 60, ups: 20 })) {
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