import type { inputSystem } from "./input";
import type { transformSnapshotSystem } from "./transformSnapshot";

// --- Built-in Engine System Names ---
/**
 * Names of internal engine systems that are always available.
 * These are added automatically by createEngine and can be accessed via useSystem.
 */
export type EngineSystemNames =
  | "engine:transformSnapshot"
  | "engine:input";

// --- Built-in Engine System Types --
/**
 * Type mapping for built-in engine systems.
 * Maps engine system names to their EngineSystem types.
 */
export type EngineSystemTypes = {
  "engine:input": ReturnType<typeof inputSystem>;
  "engine:transformSnapshot": ReturnType<typeof transformSnapshotSystem>;
};
