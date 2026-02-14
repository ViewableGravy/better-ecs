import type { InputState } from "../input.types";
import type { KeyBind, KeyBindGroup, Match, MatchList } from "./keybind.types";
import { parseKeybindString } from "./keybind.types";

/**
 * Internal implementation: Match a physical key-based keybind against the provided `InputState`.
 *
 * This uses KeyboardEvent.code (physical key) and modifier state.
 * The keybind must match the physical key and exact modifier state.
 *
 * @param state - InputState from the input system
 * @param bind - KeyBind object with code and modifiers
 * @param mode - 'pressed' uses pressedThisTick (edge), 'down' uses keysDown (held), 'released' uses releasedThisTick (edge on release)
 * @returns true if the keybind matches
 */
function internalMatchKeybind(
  state: InputState,
  bind: KeyBind | undefined,
  mode: "pressed" | "down" | "released" = "pressed",
): boolean {
  if (!bind) return false;

  // Check if the physical key matches
  const keyCodeSet = (() => {
    switch (mode) {
      case "pressed":
        return state.pressedThisTick;
      case "released":
        return state.releasedThisTick;
      case "down":
        return state.keysDown;
    }
  })();

  if (!keyCodeSet.has(bind.code)) return false;

  // Now verify modifier state matches exactly
  // We need to check which modifiers are currently held
  const modifiersHeld = getHeldModifiers(state);

  // All required modifiers must be held
  if (bind.modifiers.ctrl && !modifiersHeld.ctrl) return false;
  if (bind.modifiers.shift && !modifiersHeld.shift) return false;
  if (bind.modifiers.alt && !modifiersHeld.alt) return false;
  if (bind.modifiers.meta && !modifiersHeld.meta) return false;

  // No unrequired modifiers should be held
  if (!bind.modifiers.ctrl && modifiersHeld.ctrl) return false;
  if (!bind.modifiers.shift && modifiersHeld.shift) return false;
  if (!bind.modifiers.alt && modifiersHeld.alt) return false;
  if (!bind.modifiers.meta && modifiersHeld.meta) return false;

  return true;
}

/**
 * Determine which modifiers are currently held by checking keysDown.
 * Maps physical modifier keys (ControlLeft, ControlRight, ShiftLeft, etc.) to modifier state.
 */
function getHeldModifiers(state: InputState) {
  const modifiers = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  };

  for (const code of state.keysDown) {
    if (code === "ControlLeft" || code === "ControlRight") {
      modifiers.ctrl = true;
    } else if (code === "ShiftLeft" || code === "ShiftRight") {
      modifiers.shift = true;
    } else if (code === "AltLeft" || code === "AltRight") {
      modifiers.alt = true;
    } else if (code === "MetaLeft" || code === "MetaRight") {
      modifiers.meta = true;
    }
  }

  return modifiers;
}

/**
 * Extract numeric code from KeyCode string.
 * For "Digit0"-"Digit9", returns 0-9. For others, returns 0.
 */
function extractNumericCode(codeStr: string): number {
  const match = codeStr.match(/^Digit(\d)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Create a Match object from a KeyBind and current state.
 */
function createMatch(bind: KeyBind, state: InputState): Match {
  const modifiers = getHeldModifiers(state);

  // Attempt to derive a key character from the code string
  // This is a simplified mapping - in a real implementation, you'd have a full lookup table
  let key = bind.code;
  if (bind.code.startsWith("Key")) {
    key = bind.code.substring(3).toLowerCase();
  } else if (bind.code.startsWith("Digit")) {
    key = bind.code.substring(5);
  }

  return {
    raw: bind.code,
    code: extractNumericCode(bind.code),
    codeStr: bind.code,
    key,
    modifiers: {
      ctrl: modifiers.ctrl,
      shift: modifiers.shift,
      alt: modifiers.alt,
      meta: modifiers.meta,
    },
  };
}

/**
 * Internal helper for keybindState.
 */
export function keybindState(bind: KeyBind | undefined, state: InputState) {
  if (!bind) return { pressed: false, down: false, released: false };
  return {
    pressed: internalMatchKeybind(state, bind, "pressed"),
    down: internalMatchKeybind(state, bind, "down"),
    released: internalMatchKeybind(state, bind, "released"),
  };
}

/**
 * Parse and match a keybind string against InputState.
 *
 * This is a convenience function for string-based bindings.
 * String format: "Ctrl+Shift+Digit1" or "KeyA" or "ArrowUp"
 *
 * @param bindStr - Keybind string like "Ctrl+Shift+Digit1"
 * @param state - InputState from the input system
 * @param mode - 'pressed', 'down', or 'released'
 * @returns true if the keybind matches
 */
export function matchKeybindString(
  bindStr: string | undefined,
  state: InputState,
  mode: "pressed" | "down" | "released" = "pressed",
): boolean {
  if (!bindStr) return false;
  const bind = parseKeybindString(bindStr);
  return internalMatchKeybind(state, bind, mode);
}

/**
 * Get keybind state from a keybind string.
 * String format: "Ctrl+Shift+Digit1" or "KeyA"
 */
export function keybindStringState(bindStr: string | undefined, state: InputState) {
  if (!bindStr) return { pressed: false, down: false, released: false };
  const bind = parseKeybindString(bindStr);
  return keybindState(bind, state);
}

type Type = "some" | "every" | undefined;
type ReturnMode = "boolean" | "first" | "all";

type matchKeybindOptions<TType extends Type, TReturn extends ReturnMode = "boolean"> = {
  state?: "pressed" | "down" | "released";
  type?: TType;
  return?: TReturn;
};

type MatchKeybindReturn<TType extends Type, TReturn extends ReturnMode> = TReturn extends "boolean"
  ? TType extends undefined
    ? (bind: KeyBind) => boolean
    : (bind: KeyBindGroup) => boolean
  : TReturn extends "first"
    ? TType extends undefined
      ? (bind: KeyBind) => Match | undefined
      : (bind: KeyBindGroup) => Match | undefined
    : TReturn extends "all"
      ? TType extends undefined
        ? (bind: KeyBind) => MatchList
        : (bind: KeyBindGroup) => MatchList
      : never;

/**
 * Create a matchKeybind function prebound to the input system state.
 * This is the primary API for matching keybinds.
 */
export function createMatchKeybind(state: InputState) {
  /**
   * Match a keybind or array of keybinds with flexible options.
   *
   * @example
   * // Match a single keybind (default mode: 'pressed')
   * matchKeybind({ code: "Digit1", modifiers: { ctrl: true } })
   *
   * @example
   * // Match when ANY of several keys are down (arr.some)
   * matchKeybind({ state: "down", type: "some" })([
   *   { code: "ArrowUp", modifiers: {} },
   *   { code: "KeyW", modifiers: {} }
   * ])
   *
   * @example
   * // Get the first match with details
   * const match = matchKeybind({ return: "first" })({ code: "Digit1", modifiers: {} });
   * if (match) {
   *   console.log(match.code); // numeric code
   * }
   *
   * @example
   * // Get all matches from a group
   * const matches = matchKeybind({ type: "some", return: "all" })({
   *   code: ["Digit1", "Digit2"],
   *   modifiers: { ctrl: true }
   * });
   */
  function matchKeybind(bind: KeyBind | KeyBindGroup): boolean;
  function matchKeybind<
    TType extends "some" | "every" | undefined = undefined,
    TReturn extends ReturnMode = "boolean",
  >(options: matchKeybindOptions<TType, TReturn>): MatchKeybindReturn<TType, TReturn>;
  function matchKeybind(
    optionsOrBind?: matchKeybindOptions<Type, ReturnMode> | KeyBind | KeyBindGroup,
  ): any {
    // directly handle single keybind matching
    if ("code" in (optionsOrBind as KeyBind)) {
      const bind = optionsOrBind as KeyBind | KeyBindGroup;
      if (Array.isArray(bind.code)) {
        return bind.code.some((code) =>
          internalMatchKeybind(state, { code, modifiers: bind.modifiers }, "pressed"),
        );
      }
      const singleBind = bind as KeyBind;
      return internalMatchKeybind(state, singleBind, "pressed");
    }

    // Options object was passed, return a function that accepts bind(s)
    const options = optionsOrBind as matchKeybindOptions<Type, ReturnMode>;
    const mode = options.state ?? "pressed";
    const type = options.type;
    const returnMode = options.return ?? "boolean";

    return (bind: KeyBind | KeyBind[] | KeyBindGroup) => {
      // If no type specified, treat as single keybind
      if (!type) {
        const singleBind = bind as KeyBind;
        const matched = internalMatchKeybind(state, singleBind, mode);

        if (returnMode === "boolean") {
          return matched;
        } else if (returnMode === "first") {
          return matched ? createMatch(singleBind, state) : undefined;
        } else {
          // returnMode === 'all'
          return matched ? ([createMatch(singleBind, state)] as MatchList) : undefined;
        }
      }

      // Array of keybinds with some/every logic
      let binds: KeyBind[];

      if (Array.isArray(bind)) {
        binds = bind;
      } else if ("code" in bind && Array.isArray(bind.code)) {
        binds = bind.code.map((code) => ({ code, modifiers: bind.modifiers }));
      } else {
        binds = [bind as KeyBind];
      }

      if (returnMode === "boolean") {
        return binds[type]((b) => internalMatchKeybind(state, b, mode));
      } else if (returnMode === "first") {
        // Find first match
        for (const b of binds) {
          if (internalMatchKeybind(state, b, mode)) {
            return createMatch(b, state);
          }
        }
        return undefined;
      } else {
        // returnMode === 'all' - return all matches
        const matches: Match[] = [];
        for (const b of binds) {
          if (internalMatchKeybind(state, b, mode)) {
            matches.push(createMatch(b, state));
          }
        }
        return matches.length > 0 ? (matches as MatchList) : undefined;
      }
    };
  }

  return matchKeybind;
}
