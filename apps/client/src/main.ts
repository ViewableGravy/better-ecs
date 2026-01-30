// apps/client/src/main.ts
import './styles.css';
import * as Engine from "@repo/engine";
import z from "zod";
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
  function LagSystemEntrypoint() {
    const input = Engine.useSystem("engine:input");
    const self = Engine.useSystem("lag:controller");

    const match = input.matchKeybind({ state: "down", type: "some", return: "first" })({
      modifiers: { ctrl: true, shift: true },
      code: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"], 
    })

    if (!match) return self.data.lagFps = 0;

    // set lagFPS to code * 10 (code is 1-9 for Digit1-Digit9)
    self.data.lagFps = match.code * 10;
  }

  // Small system to read input and expose a `lagFps` value on its `data`.
  const LagSystem = Engine.createSystem("lag:controller")({
    system: LagSystemEntrypoint,
    schema: {
      default: { lagFps: 0 },
      schema: z.object({ lagFps: z.number() }),
    },
  });

  const engine = Engine.createEngine({
    initialization: Initialize,
    systems: [
      // Plugins
      FPSCounter({ 
        element: document.getElementById('fps-counter')!,
        round: true,
        rate: 1000,
        modeToggleKey: { 
          code: "KeyF", 
          modifiers: { 
            ctrl: true, 
            shift: true 
          }
        }
      }),

      // Lag controller (reads input)
      LagSystem,

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
      // Read lag fps from the lag system data (updated via engine systems)
      const { data } = engine['systems']["lag:controller"];

      if (data.lagFps > 0) {
        const frameStart = performance.now();
        const targetMs = 1000 / data.lagFps;
        while (performance.now() - frameStart < targetMs) {
          // intentional busy-wait to simulate a slow frame while key is held
        }
      }
    }
  }
  
  // Return engine for type registration
  return engine;
}

main();