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
