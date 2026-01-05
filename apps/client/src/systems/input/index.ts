import { createSystem, useSystem } from "@repo/engine/core";
import z from "zod";
import { EventPool } from "./eventPool";

/***** SYSTEM SCHEMA START *****/
const InputStateSchema = z.object({
  /** @public Set of keys currently held across frames. */
  keysDown: z.set(z.string()),

  /** @public Keys that were newly pressed during this update (cleared at start of update). */
  pressedThisTick: z.set(z.string()),

  /** @public Keys that were newly released during this update (cleared at start of update). */
  releasedThisTick: z.set(z.string()),

  /** @public Keys considered "active" for this update (what movement/other systems should iterate). */
  keysActive: z.set(z.string()),

  /**
   * @private Reused set to record keys pressed while processing events for this update.
   * Avoids allocating a new Set each frame; treated as internal implementation detail.
   */
  pressedBetweenUpdate: z.set(z.string()),

  /** @private Buffer of raw keyboard events to process during update. */
  eventBuffer: z.array(z.object({ 
    type: z.enum(["keydown", "keyup"]), 
    key: z.string(), 
    release: z.function() 
  }).readonly()),
});

/***** SYSTEM START *****/
export const System = createSystem("input")({
  initialize: InitializeEventListeners,
  system: Entrypoint,
  enabled: true,
  phase: "update",
  schema: {
    default: {
      keysDown: new Set<string>(),
      pressedThisTick: new Set<string>(),
      releasedThisTick: new Set<string>(),
      keysActive: new Set<string>(),
      pressedBetweenUpdate: new Set<string>(),
      eventBuffer: [],
    },
    schema: InputStateSchema,
  }
});

/***** ENTRYPOINT START *****/
function Entrypoint() {
  const { data } = useSystem("input")

  // Clear per-tick buffers at start of this update
  data.pressedThisTick.clear();
  data.releasedThisTick.clear();
  data.pressedBetweenUpdate.clear();
  data.keysActive.clear();

  // Initialize keysActive with keys that were already down from the previous frame
  for (const key of data.keysDown) {
    data.keysActive.add(key);
  }

  // Process all buffered events
  for (const event of data.eventBuffer) {
    switch (event.type) {
      case "keydown": {
        // Only track new presses (ignore repeated keydown from held keys)
        if (data.keysDown.has(event.key)) break;

        data.keysDown.add(event.key);
        data.pressedThisTick.add(event.key);
        data.keysActive.add(event.key);
        data.pressedBetweenUpdate.add(event.key);
        break;
      }
      case "keyup": {
        // Track releases
        if (!data.keysDown.has(event.key)) break;

        data.keysDown.delete(event.key);
        data.releasedThisTick.add(event.key);

        // If the key was held from a previous frame (not pressed during event processing),
        // ensure it's removed from keysActive to "cancel" any pending update on key release.
        // If it WAS pressed during event processing and is not pressed now, then it was a tap,
        // and we still expect the tap to be registered.
        if (!data.pressedBetweenUpdate.has(event.key)) {
          data.keysActive.delete(event.key);
        }
        
        break;
      }
    }

    // release event back to pool
    event.release();
  }

  
  // Clear the event buffer for next update  
  data.eventBuffer.length = 0;
}

function InitializeEventListeners() {
  const { data } = useSystem("input");

  const eventPool = new EventPool();

  // Browser event listeners: buffer events without processing immediately
  window.addEventListener("keydown", (event) => {
    data.eventBuffer.push(eventPool.press("keydown", event.key));
  });

  window.addEventListener("keyup", (event) => {
    data.eventBuffer.push(eventPool.press("keyup", event.key));
  });
}
