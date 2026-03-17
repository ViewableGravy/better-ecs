import {
    IndexedDbWorkerInputAdapter,
    IndexedDbWorkerOutputAdapter,
    serializationSystem,
} from "@libs/state-sync";

import {
    STORAGE_DATABASE_NAME,
    STORAGE_KEY,
    STORAGE_STORE_NAME,
} from "./const";
import { reconnectPersistedTransportBelts } from "./utilities";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = serializationSystem({
  name: "client:persistence",
  inputAdapter: new IndexedDbWorkerInputAdapter({
    databaseName: STORAGE_DATABASE_NAME,
    storeName: STORAGE_STORE_NAME,
    storageKey: STORAGE_KEY,
    onHydrate: (_sceneState, context) => {
      reconnectPersistedTransportBelts(context);
    },
  }),
  outputAdapter: new IndexedDbWorkerOutputAdapter({
    databaseName: STORAGE_DATABASE_NAME,
    storeName: STORAGE_STORE_NAME,
    storageKey: STORAGE_KEY,
    flushIntervalMs: 1000,
  }),
});