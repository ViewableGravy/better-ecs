import type { InputState } from "./index";

function parseKeybind(keybind: string) {
  const parts = keybind.toLowerCase().split('+');
  const modifiers = { ctrl: false, shift: false, alt: false, key: '' };

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') modifiers.ctrl = true;
    else if (part === 'shift') modifiers.shift = true;
    else if (part === 'alt') modifiers.alt = true;
    else modifiers.key = part;
  }

  return modifiers;
}

function setHasLower(set: Set<string>, needleLower: string) {
  for (const v of set) {
    if (String(v).toLowerCase() === needleLower) return true;
  }
  return false;
}

/**
 * Match a keybind string against the provided `InputState`.
 * - `bind` format: e.g. `ctrl+shift+f` or `f`
 * - `mode`: `'pressed' | 'down' | 'released'`
 *
 * `pressed` uses `pressedThisTick` (edge), `down` uses `keysDown` (held),
 * `released` uses `releasedThisTick` (edge on release).
 */
export function matchKeybind(bind: string | undefined, state: InputState, mode: 'pressed' | 'down' | 'released' = 'pressed') {
  if (!bind) return false;
  const kb = parseKeybind(bind);
  if (!kb.key) return false;

  const keyLower = kb.key.toLowerCase();

  // Modifiers must be held (checked against keysDown)
  if (kb.ctrl && !setHasLower(state.keysDown, 'control') && !setHasLower(state.keysDown, 'ctrl')) return false;
  if (kb.shift && !setHasLower(state.keysDown, 'shift')) return false;
  if (kb.alt && !setHasLower(state.keysDown, 'alt')) return false;

  if (mode === 'pressed') {
    return setHasLower(state.pressedThisTick, keyLower);
  }

  if (mode === 'released') {
    return setHasLower(state.releasedThisTick, keyLower);
  }

  // 'down'
  return setHasLower(state.keysDown, keyLower);
}

export function keybindState(bind: string | undefined, state: InputState) {
  if (!bind) return { pressed: false, down: false, released: false };
  return {
    pressed: matchKeybind(bind, state, 'pressed'),
    down: matchKeybind(bind, state, 'down'),
    released: matchKeybind(bind, state, 'released'),
  };
}
