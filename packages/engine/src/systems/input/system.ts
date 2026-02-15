import { EventPool } from "@repo/utils";
import { useOverloadedSystem } from "../../core/context";
import { createSystem, type EngineSystem } from "../../core/register/system";
import { InputStateSchema } from "./input.types";
import { createMatchKeybind } from "./keybind/keybind";

/***** SYSTEM START *****/
export const inputSystem = createSystem("engine:input")({
  initialize: Initialize,
  system: Entrypoint,
  enabled: true,
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
      matchKeybind: createMatchKeybind(data),
    };
  },
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
  if (typeof window === "undefined") return;

  const { data } = useOverloadedSystem<EngineSystem<typeof InputStateSchema>>("engine:input");

  const eventPool = new EventPool();

  // Browser event listeners: buffer events using physical key (code) instead of character (key)
  const keydownHandler = (event: KeyboardEvent) => {
    // Ignore auto-repeat keydown events to prevent unbounded buffering on long key holds.
    if (event.repeat) return;

    data.eventBuffer.push(
      eventPool.press(
        "keydown",
        event.code,
        event.ctrlKey,
        event.shiftKey,
        event.altKey,
        event.metaKey,
      ),
    );
  };

  const keyupHandler = (event: KeyboardEvent) => {
    data.eventBuffer.push(
      eventPool.press(
        "keyup",
        event.code,
        event.ctrlKey,
        event.shiftKey,
        event.altKey,
        event.metaKey,
      ),
    );
  };

  window.addEventListener("keydown", keydownHandler);
  window.addEventListener("keyup", keyupHandler);

  return () => {
    window.removeEventListener("keydown", keydownHandler);
    window.removeEventListener("keyup", keyupHandler);
  };
}
