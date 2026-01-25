import { createSystem, useOverloadedSystem,type EngineSystem } from "@repo/engine/core";
import { EventPool } from "@repo/utils";
import { createMatchKeybind } from "./keybind/keybind";
import { z } from "zod";

/***** SYSTEM SCHEMA START *****/
export const InputStateSchema = z.object({
  /** @public Set of physical keys currently held across frames (stores `code` values like "Digit1", "KeyA"). */
  keysDown: z.set(z.string()),

  /** @public Codes that were newly pressed during this update (cleared at start of update). */
  pressedThisTick: z.set(z.string()),

  /** @public Codes that were newly released during this update (cleared at start of update). */
  releasedThisTick: z.set(z.string()),

  /** @public Codes considered "active" for this update (what movement/other systems should iterate). */
  keysActive: z.set(z.string()),

  /**
   * @private Reused set to record codes pressed while processing events for this update.
   * Avoids allocating a new Set each frame; treated as internal implementation detail.
   */
  pressedBetweenUpdate: z.set(z.string()),

  /** @private Buffer of raw keyboard events to process during update (code + modifiers). */
  eventBuffer: z.array(z.object({ 
    type: z.enum(["keydown", "keyup"]), 
    code: z.string(),
    ctrl: z.boolean(),
    shift: z.boolean(),
    alt: z.boolean(),
    meta: z.boolean(),
    release: z.function() 
  }).readonly()),
});

export type InputState = z.infer<typeof InputStateSchema>;

/***** SYSTEM START *****/
export const inputSystem = createSystem("engine:input")({
  initialize: Initialize,
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
  },
  methods(system) {
    // Return methods object that will be merged with system
    // The methods will be called during system execution where useOverloadedSystem is available
    const data = system.data;
    
    return {
      matchKeybind: createMatchKeybind(data)
    }
  }
});

/***** ENTRYPOINT START *****/
function Entrypoint() {
  const { data } = useOverloadedSystem<EngineSystem<typeof InputStateSchema>>("engine:input");

  // Clear per-tick buffers at start of this update
  data.pressedThisTick.clear();
  data.releasedThisTick.clear();
  data.pressedBetweenUpdate.clear();
  data.keysActive.clear();

  // Initialize keysActive with codes that were already down from the previous frame
  for (const code of data.keysDown) {
    data.keysActive.add(code);
  }

  // Process all buffered events
  for (const event of data.eventBuffer) {
    switch (event.type) {
      case "keydown": {
        // Only track new presses (ignore repeated keydown from held keys)
        if (data.keysDown.has(event.code)) break;

        data.keysDown.add(event.code);
        data.pressedThisTick.add(event.code);
        data.keysActive.add(event.code);
        data.pressedBetweenUpdate.add(event.code);
        break;
      }
      case "keyup": {
        // Track releases
        if (!data.keysDown.has(event.code)) break;

        data.keysDown.delete(event.code);
        data.releasedThisTick.add(event.code);

        // If the code was held from a previous frame (not pressed during event processing),
        // ensure it's removed from keysActive to "cancel" any pending update on key release.
        // If it WAS pressed during event processing and is not pressed now, then it was a tap,
        // and we still expect the tap to be registered.
        if (!data.pressedBetweenUpdate.has(event.code)) {
          data.keysActive.delete(event.code);
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

function Initialize() {
  // Only initialize in browser environment
  if (typeof window === 'undefined') return;

  const { data } = useOverloadedSystem<EngineSystem<typeof InputStateSchema>>("engine:input");

  const eventPool = new EventPool();

  // Browser event listeners: buffer events using physical key (code) instead of character (key)
  window.addEventListener("keydown", (event) => {
    data.eventBuffer.push(eventPool.press("keydown", event.code, event.ctrlKey, event.shiftKey, event.altKey, event.metaKey));
  });

  window.addEventListener("keyup", (event) => {
    data.eventBuffer.push(eventPool.press("keyup", event.code, event.ctrlKey, event.shiftKey, event.altKey, event.metaKey));
  });
}