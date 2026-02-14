import { z } from "zod";
import type { KeyBind } from "./keybind.types";

/**
 * Schema for serializing/deserializing KeyBind objects to JSON.
 *
 * Example:
 * ```json
 * {
 *   "code": "Digit1",
 *   "modifiers": {
 *     "ctrl": true,
 *     "shift": true,
 *     "alt": false,
 *     "meta": false
 *   }
 * }
 * ```
 */
export const KeyBindSchema = z.object({
  code: z.string().min(1, "code must not be empty"),
  modifiers: z.object({
    ctrl: z.boolean(),
    shift: z.boolean(),
    alt: z.boolean(),
    meta: z.boolean(),
  }),
}) satisfies z.ZodType<KeyBind>;

/**
 * Validate a KeyBind object against the schema.
 */
export function validateKeybind(value: unknown): value is KeyBind {
  try {
    KeyBindSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serialize a KeyBind to JSON.
 */
export function serializeKeybind(bind: KeyBind): string {
  return JSON.stringify(bind);
}

/**
 * Deserialize a KeyBind from JSON.
 * @throws Error if JSON is invalid or doesn't match KeyBindSchema
 */
export function deserializeKeybind(json: string): KeyBind {
  const value = JSON.parse(json);
  return KeyBindSchema.parse(value);
}

/**
 * Serialize an array of KeyBinds to JSON.
 */
export function serializeKeybinds(binds: KeyBind[]): string {
  return JSON.stringify(binds);
}

/**
 * Deserialize an array of KeyBinds from JSON.
 * @throws Error if JSON is invalid or doesn't match array schema
 */
export function deserializeKeybinds(json: string): KeyBind[] {
  const value = JSON.parse(json);
  return z.array(KeyBindSchema).parse(value);
}

/**
 * Serialize keybinds to a configuration object.
 *
 * Example usage:
 * ```ts
 * const config = {
 *   moveUp: { code: "KeyW", modifiers: { ctrl: false, ... } },
 *   moveDown: { code: "KeyS", modifiers: { ctrl: false, ... } },
 * };
 * const json = serializeKeybindConfig(config);
 * localStorage.setItem("keybinds", json);
 * ```
 */
export function serializeKeybindConfig(config: Record<string, KeyBind>): string {
  return JSON.stringify(config);
}

/**
 * Deserialize keybinds from a configuration object.
 * @throws Error if JSON is invalid
 */
export function deserializeKeybindConfig(json: string): Record<string, KeyBind> {
  const value = JSON.parse(json);
  const configSchema = z.record(z.string(), KeyBindSchema);
  return configSchema.parse(value);
}
