import type { KeyboardEventData } from "@utils";

export type InputState = {
  /** @public Latest pointer X in viewport/client space (`event.clientX`). */
  mouseClientX: number;

  /** @public Latest pointer Y in viewport/client space (`event.clientY`). */
  mouseClientY: number;

  /** @public Set of physical keys currently held across frames (stores `code` values like "Digit1", "KeyA"). */
  keysDown: Set<string>;

  /** @public Codes that were newly pressed during this update (cleared at start of update). */
  pressedThisTick: Set<string>;

  /** @public Codes that were newly released during this update (cleared at start of update). */
  releasedThisTick: Set<string>;

  /** @public Codes considered "active" for this update (what movement/other systems should iterate). */
  keysActive: Set<string>;

  /**
   * @private Reused set to record codes pressed while processing events for this update.
   * Avoids allocating a new Set each frame; treated as internal implementation detail.
   */
  pressedBetweenUpdate: Set<string>;

  /** @private Buffer of raw keyboard events to process during update (code + modifiers). */
  eventBuffer: Array<Readonly<KeyboardEventData>>;
};
