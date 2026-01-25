// apps/client/src/main.ts
import * as Engine from "@repo/engine";
import { System as FPSCounter } from '@repo/plugins';
import { System as Collision } from './systems/collision';
import { System as Initialize } from "./systems/initialisation";
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
      // Plugins
      FPSCounter({ 
        element: document.getElementById('fps-counter')!,
        round: true,
        rate: 1000,
        simpleModeToggleKey: 'ctrl+shift+f'
      }),

      // Update systems (input is now built-in as "engine:input")
      Movement,
      Physics,
      Collision,

      // Render systems
      Render,
    ]
  });

  // Start application
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