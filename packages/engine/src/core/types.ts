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

