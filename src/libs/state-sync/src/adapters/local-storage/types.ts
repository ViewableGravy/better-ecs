import type { SerializedSceneState } from "@libs/state-sync/scene-state";
import type { SceneStateSyncLoadContext } from "@libs/state-sync/types";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type LocalStorageAdapterOptions = {
  storageKey: string;
  storage?: StorageLike;
  flushIntervalMs?: number;
  frameBudgetMs?: number;
};

export type ParsedStoredSceneState = {
  state: SerializedSceneState | null;
  hasStoredValue: boolean;
};

export type LocalStorageBackendEvent =
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

export type LocalStorageBackendListener<TType extends LocalStorageBackendEvent["type"]> = (
  event: Extract<LocalStorageBackendEvent, { type: TType }>,
) => void;

export type LocalStorageInputAdapterOptions = LocalStorageAdapterOptions & {
  onHydrate?: (sceneState: SerializedSceneState, context: SceneStateSyncLoadContext) => Promise<void> | void;
};

export type LocalStorageOutputAdapterOptions = LocalStorageAdapterOptions;