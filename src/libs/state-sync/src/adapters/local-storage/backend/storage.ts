import type { LocalStorageAdapterOptions, ParsedStoredSceneState, StorageLike } from "@libs/state-sync/adapters/local-storage/types";
import { parseSerializedSceneState, type SerializedSceneState } from "@libs/state-sync/scene-state";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function resolveStorage(options: LocalStorageAdapterOptions): StorageLike | null {
  if (options.storage) {
    return options.storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export async function readStoredSceneState(options: LocalStorageAdapterOptions): Promise<ParsedStoredSceneState> {
  const storage = resolveStorage(options);
  if (!storage) {
    return { state: null, hasStoredValue: false };
  }

  const raw = storage.getItem(options.storageKey);
  if (raw === null) {
    return { state: null, hasStoredValue: false };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const sceneState = parseSerializedSceneState(parsed);
    if (!sceneState) {
      return { state: null, hasStoredValue: true };
    }

    return { state: sceneState, hasStoredValue: true };
  } catch {
    return { state: null, hasStoredValue: true };
  }
}

export function writeStoredSceneState(options: LocalStorageAdapterOptions, state: SerializedSceneState): void {
  const storage = resolveStorage(options);
  if (!storage) {
    return;
  }

  storage.setItem(options.storageKey, JSON.stringify(state));
}