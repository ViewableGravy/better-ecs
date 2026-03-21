import type { SerializedSceneState } from "@libs/state-sync/scene-state";
import type { SceneStateSyncLoadContext } from "@libs/state-sync/types";

export type IndexedDbWorkerAdapterOptions = {
  databaseName: string;
  storeName: string;
  storageKey: string;
  flushIntervalMs?: number;
};

export type IndexedDbWorkerBackendEvent =
  | {
      type: "loaded";
      hasStoredState: boolean;
    }
  | {
      type: "flushed";
    }
  | {
      type: "error";
      error: unknown;
    };

export type IndexedDbWorkerInputAdapterOptions = IndexedDbWorkerAdapterOptions & {
  onHydrate?: (sceneState: SerializedSceneState, context: SceneStateSyncLoadContext) => Promise<void> | void;
};

export type IndexedDbWorkerOutputAdapterOptions = IndexedDbWorkerAdapterOptions;