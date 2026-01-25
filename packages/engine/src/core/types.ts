import type { EngineClass } from "@repo/engine/core/register/engine";
import type { SystemFactory } from "@repo/engine/core/register/system";
import type { StandardSchemaV1 } from "@standard-schema/spec";

// --- Engine Lifecycle Types ---
export type EngineUpdate = {
  readonly delta: number;
  readonly shouldUpdate: boolean;
}

export type EngineFrame = {
  readonly delta: number;
  readonly shouldUpdate: boolean;
}

// --- Frame Stats Type ---
export type FrameStats = {
  /** Delta time since last update in milliseconds */
  updateDelta: number;
  /** Delta time since last frame in milliseconds */
  frameDelta: number;
  /** Checks which phase we are currently in */
  phase: (phase: "update" | "render") => boolean;
  /** Target frames per second */
  fps: number;
  /** Target updates per second */
  ups: number;
  /** Progress through current update interval (0.0 to 1.0) */
  updateProgress: number;
  /** Timestamp of the last update in milliseconds */
  lastUpdateTime: number;
}

// --- Schema Types ---
export type StandardSchema = { '~standard': unknown };
export type InferStandardSchema<TSchema> = TSchema extends StandardSchemaV1<infer TInput, infer TOutput> ? {
  input: TInput;
  output: TOutput;
} : never;

// --- Engine Types ---

// Tuple of SystemFactory types
export type SystemFactoryTuple = Array<SystemFactory<string, StandardSchema>>;

// --- Built-in Engine System Names ---
/**
 * Names of internal engine systems that are always available.
 * These are added automatically by createEngine and can be accessed via useSystem.
 */
export type EngineSystemNames = 
  | "engine:transformSnapshot"
  | "engine:input";

// --- Built-in Engine System Types ---
import type { inputSystem, InputStateSchema } from "../systems/input";
import type { transformSnapshotSystem } from "../systems/transformSnapshot";

/**
 * Type mapping for built-in engine systems.
 * Maps engine system names to their EngineSystem types.
 */
export type EngineSystemTypes = {
  "engine:input": ReturnType<typeof inputSystem>;
  "engine:transformSnapshot": ReturnType<typeof transformSnapshotSystem>;
};

// --- Type Registration (via module augmentation) ---
export interface Register {
  // Engine: EngineTypeInfo<...>
}

export type AnyEngine = EngineClass<any>;

export type RegisteredEngine<TRegister = Register> = 
  TRegister extends { 
    Engine: infer TEngine extends AnyEngine
  } 
    ? TEngine
    : AnyEngine;

/** 
 * Helper type to get all available system names including both user-defined 
 * and built-in engine systems.
 */
export type AllSystemNames<TRegister = Register> = keyof RegisteredEngine<TRegister>['systems'];
