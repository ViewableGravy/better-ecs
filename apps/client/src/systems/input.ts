import { createSystem, useEngine } from "@repo/engine/core";
import z from "zod";

export const System = createSystem("input")({
  system: Entrypoint,
  enabled: true,
  phase: "update",
  schema: {
    default: {
      keysDown: [],
      hasInitialized: false,
    },
    schema: z.object({
      keysDown: z.array(z.string()),
      hasInitialized: z.boolean(),
    })
  },
});

function Entrypoint() {
  const engine = useEngine();

  if (engine.systems.input.data.hasInitialized) return;

  const { keysDown } = engine.systems.input.data;
  
  // basic input handling
  window.addEventListener("keydown", (event) => {
    if (!keysDown.includes(event.key)) {
      keysDown.push(event.key);
    }
  });

  window.addEventListener("keyup", (event) => {
    const index = keysDown.indexOf(event.key);
    if (index !== -1) {
      keysDown.splice(index, 1);
    }
  });

  engine.systems.input.data.hasInitialized = true;
}