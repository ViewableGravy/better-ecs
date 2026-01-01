// apps/client/src/main.ts
import * as Engine from "@repo/engine";
import { System as collisionSystem } from './systems/collision';
import { System as inputSystem } from './systems/input';
import { System as movementSystem } from './systems/movement';
import { System as physicsSystem } from './systems/physics';
import { System as renderSystem } from './systems/render';

declare module "@repo/engine" {
  interface Register {
    Engine: ReturnType<typeof main>;
  }
}

async function main() {
  // Initialize the engine
  const registerableEngine = Engine.registerEngine({
    systems: [
      // Update systems
      Engine.registerSystem(inputSystem),
      Engine.registerSystem(movementSystem),
      Engine.registerSystem(physicsSystem),
      Engine.registerSystem(collisionSystem),

      // Render systems
      Engine.registerSystem(renderSystem),
    ],
  });

  // Start application
  for await (const [update, frame] of Engine.startEngine({ fps: 60, ups: 30 })) {
    if (update.shouldUpdate) {

    }

    if (frame.shouldUpdate) {

    }
  }
  
  // Purely returned 
  return registerableEngine;
}

main();