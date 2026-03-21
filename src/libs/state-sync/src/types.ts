import type { RegisteredEngine } from "@engine/core/engine-types";
import type { SceneContext } from "@engine/core/scene/scene-context";
import type { DiffCommand } from "@engine/serialization";
import type { SerializedSceneState } from "@libs/state-sync/scene-state";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type StateSyncCommand = DiffCommand;

export type StateSyncBackendEvent = {
  type: string;
};

export type StateSyncBackend<TState, TCommand, TEvent extends StateSyncBackendEvent> = {
  load: () => Promise<TState | null>;
  emit: (command: TCommand) => void;
  on: <TType extends TEvent["type"]>(
    type: TType,
    listener: (event: Extract<TEvent, { type: TType }>) => void,
  ) => () => void;
};

export type SceneStateSyncLoadContext = {
  engine: RegisteredEngine;
  scene: SceneContext;
  serializeSceneState: () => SerializedSceneState;
  applySceneState: (state: SerializedSceneState) => void;
  drainDiffCommands: () => DiffCommand[];
};

export type SceneStateSyncRuntimeContext = {
  engine: RegisteredEngine;
  scene: SceneContext;
  updateDelta: number;
};

export type SceneStateSyncOutputAdapterContext = SceneStateSyncRuntimeContext & {
  commands: readonly StateSyncCommand[];
  drainCommands: () => StateSyncCommand[];
};

export type SceneStateSyncLoadAdapter = {
  load: (context: SceneStateSyncLoadContext) => Promise<boolean>;
};

export type SceneStateSyncOutputAdapter = {
  initialize?: (context: SceneStateSyncRuntimeContext) => void;
  update: (context: SceneStateSyncOutputAdapterContext) => void;
};

export type SerializationSystemOptions = {
  name?: string;
  priority?: number;
  enabled?: boolean;
  inputAdapter?: SceneStateSyncLoadAdapter;
  outputAdapter: SceneStateSyncOutputAdapter;
};