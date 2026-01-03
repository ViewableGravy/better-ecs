import type { EngineClass } from "@repo/engine/core/register/engine";
import type { SystemFactory } from "@repo/engine/core/register/system";
import type { StandardJSONSchemaV1 } from "@standard-schema/spec";

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
export type InferStandardSchema<TSchema> = TSchema extends StandardJSONSchemaV1<infer TInput, infer TOutput> ? {
  input: TInput;
  output: TOutput;
} : never;

// --- Engine Types ---

// Tuple of SystemFactory types
export type SystemFactoryTuple = Array<SystemFactory<string, StandardSchema>>;

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
