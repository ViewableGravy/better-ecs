import { createSystem, useSystem } from "@repo/engine/core";
import z from "zod";

/***** SYSTEM SCHEMA START *****/
const InputStateSchema = z.object({
  keysDown: z.set(z.string()),
  pressedThisTick: z.set(z.string()),
  releasedThisTick: z.set(z.string()),
  eventBuffer: z.array(z.object({ type: z.enum(["keydown", "keyup"]), key: z.string() })),
});

/***** SYSTEM START *****/
export const System = createSystem("input")({
  system: Entrypoint,
  enabled: true,
  phase: "update",
  schema: {
    default: {
      keysDown: new Set<string>(),
      pressedThisTick: new Set<string>(),
      releasedThisTick: new Set<string>(),
      eventBuffer: [],
    },
    schema: InputStateSchema,
  },
  initialize: InitializeEventListeners,
});

/***** ENTRYPOINT START *****/
function Entrypoint() {
  const { data } = useSystem("input")

  // Clear per-tick buffers at start of this update
  data.pressedThisTick.clear();
  data.releasedThisTick.clear();

  // Process all buffered events
  for (const event of data.eventBuffer) {
    if (event.type === "keydown") {
      // Only track new presses (ignore repeated keydown from held keys)
      if (!data.keysDown.has(event.key)) {
        data.keysDown.add(event.key);
        data.pressedThisTick.add(event.key);
      }
    } else if (event.type === "keyup") {
      // Track releases
      if (data.keysDown.has(event.key)) {
        data.keysDown.delete(event.key);
        data.releasedThisTick.add(event.key);
      }
    }
  }

  // Clear the event buffer for next update
  data.eventBuffer.length = 0;
}

function InitializeEventListeners() {
  const { data } = useSystem("input")

  // Browser event listeners: buffer events without processing immediately
  window.addEventListener("keydown", (event) => {
    data.eventBuffer.push({ type: "keydown", key: event.key });
  });

  window.addEventListener("keyup", (event) => {
    data.eventBuffer.push({ type: "keyup", key: event.key });
  });
}