import {
    STORAGE_DATABASE_NAME,
    STORAGE_KEY,
    STORAGE_STORE_NAME,
} from "@client/systems/core/persistence/const";
import { reconnectPersistedTransportBelts } from "@client/systems/core/persistence/utilities";
import type { RegisteredEngine } from "@engine";
import {
    IndexedDbWorkerInputAdapter,
    IndexedDbWorkerOutputAdapter,
} from "@libs/state-sync";

export const persistenceInputAdapter = new IndexedDbWorkerInputAdapter({
  databaseName: STORAGE_DATABASE_NAME,
  storeName: STORAGE_STORE_NAME,
  storageKey: STORAGE_KEY,
  onHydrate: (_sceneState, context) => {
    reconnectPersistedTransportBelts(context);
  },
});

export const persistenceOutputAdapter = new IndexedDbWorkerOutputAdapter({
  databaseName: STORAGE_DATABASE_NAME,
  storeName: STORAGE_STORE_NAME,
  storageKey: STORAGE_KEY,
  flushIntervalMs: 1000,
});

export async function resetPersistedScene(engine: RegisteredEngine): Promise<void> {
  await persistenceOutputAdapter.clear();
  await engine.scene.reload();
}