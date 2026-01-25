/**
 * Type-safe keyboard code for Australian keyboard layout.
 * Includes primary keys and navigation keys.
 * 
 * Note: While TypeScript enforces this union for type safety,
 * runtime code may use string values that aren't in this union
 * (e.g., from KeyboardEvent.code). These are typed as KeyCode
 * at definition time for the main API.
 */
export type KeyCode = 
  // Number row
  | "Digit0" | "Digit1" | "Digit2" | "Digit3" | "Digit4"
  | "Digit5" | "Digit6" | "Digit7" | "Digit8" | "Digit9"
  // Letter keys (QWERTY)
  | "KeyA" | "KeyB" | "KeyC" | "KeyD" | "KeyE" | "KeyF" | "KeyG" | "KeyH" | "KeyI" | "KeyJ"
  | "KeyK" | "KeyL" | "KeyM" | "KeyN" | "KeyO" | "KeyP" | "KeyQ" | "KeyR" | "KeyS" | "KeyT"
  | "KeyU" | "KeyV" | "KeyW" | "KeyX" | "KeyY" | "KeyZ"
  // Navigation
  | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
  | "Home" | "End" | "PageUp" | "PageDown"
  // Whitespace & modifiers
  | "Space" | "Enter" | "Tab" | "Escape" | "Backspace" | "Delete"
  | "ShiftLeft" | "ShiftRight" | "ControlLeft" | "ControlRight" | "AltLeft" | "AltRight" | "MetaLeft" | "MetaRight"
  // Punctuation & symbols (Australian keyboard)
  | "Minus" | "Equal" | "BracketLeft" | "BracketRight" | "Backslash"
  | "Semicolon" | "Quote" | "Comma" | "Period" | "Slash"
  | "Backtick"
  | (string & {});  // Allow any string at runtime while maintaining type safety in the union

/**
 * Modifier state for keyboard input.
 * Modifiers are state, not keys - they don't change the identity of a binding.
 */
export interface KeyModifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * Physical keybind representation (layout-independent).
 * 
 * Uses `code` (physical key) instead of `key` (character).
 * Examples:
 * - `code: "Digit1"` for the 1 key (regardless of layout)
 * - `code: "KeyA"` for the A key (regardless of layout)
 * - `code: "ArrowUp"` for arrow up
 * 
 * Modifiers are captured separately and do not change key identity.
 * `Ctrl+Shift+1` and `1` are different bindings (different modifier state).
 */
export interface KeyBind {
  code: KeyCode;
  modifiers: KeyModifiers;
}

/**
 * Represents a group of keybinds sharing the same modifiers.
 * Useful for concise definition of multiple keys.
 */
export interface KeyBindGroup {
  code: KeyCode[];
  modifiers: KeyModifiers;
}

/**
 * Create a KeyModifiers object from a KeyboardEvent.
 */
export function getModifiers(event: KeyboardEvent): KeyModifiers {
  return {
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
}

/**
 * Check if two modifier states are equal.
 */
export function modifiersEqual(a: KeyModifiers, b: KeyModifiers): boolean {
  return a.ctrl === b.ctrl && a.shift === b.shift && a.alt === b.alt && a.meta === b.meta;
}

/**
 * Create a string representation of a keybind for display purposes.
 * Example: "Ctrl+Shift+Digit1" or "KeyA"
 */
export function formatKeybind(bind: KeyBind): string {
  const parts: string[] = [];
  
  if (bind.modifiers.ctrl) parts.push("Ctrl");
  if (bind.modifiers.shift) parts.push("Shift");
  if (bind.modifiers.alt) parts.push("Alt");
  if (bind.modifiers.meta) parts.push("Meta");
  
  parts.push(bind.code);
  
  return parts.join("+");
}

/**
 * Parse a keybind from a string representation (reverse of formatKeybind).
 * Example: "Ctrl+Shift+Digit1" → { code: "Digit1", modifiers: { ctrl: true, shift: true, ... } }
 */
export function parseKeybindString(bindStr: string): KeyBind {
  const parts = bindStr.split("+").map((p) => p.trim());
  const modifiers: KeyModifiers = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  };
  
  let code = "";
  
  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    if (lowerPart === "ctrl" || lowerPart === "control") {
      modifiers.ctrl = true;
    } else if (lowerPart === "shift") {
      modifiers.shift = true;
    } else if (lowerPart === "alt") {
      modifiers.alt = true;
    } else if (lowerPart === "meta" || lowerPart === "cmd" || lowerPart === "command") {
      modifiers.meta = true;
    } else {
      // The last non-modifier part is the code
      code = part;
    }
  }
  
  return { code, modifiers };
}

/**
 * Check if two keybinds are equal.
 */
export function keybindsEqual(a: KeyBind, b: KeyBind): boolean {
  return a.code === b.code && modifiersEqual(a.modifiers, b.modifiers);
}

/**
 * Detailed match information when a keybind is matched.
 * Contains the matched key code, modifiers, and metadata.
 */
export interface Match {
  /** Original key code string (e.g., "Digit1", "KeyA") */
  raw: string;
  /** Numeric representation of the key code (extracts number from "Digit0-9" or 0 for others) */
  code: number;
  /** Key code string from KeyboardEvent.code */
  codeStr: string;
  /** Character key from KeyboardEvent.key (if available) */
  key: string;
  /** Modifier state when the match occurred */
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
}

/**
 * Type-safe match list: either undefined (no match) or a non-empty tuple with at least one Match.
 * This guarantees that when defined, matches[0] is always available.
 */
export type MatchList = undefined | [Match, ...Match[]];
