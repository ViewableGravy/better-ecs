/// <reference lib="webworker" />

import type { DiffCommand, EntityId, SerializedObject } from "@engine";
import type { SerializedSceneState, SerializedSceneWorld } from "@libs/state-sync/scene-state";
import { cloneSerializedObject, cloneSerializedValue } from "@libs/state-sync/scene-state/serialize/serialize-value";

type SerializedWorldEntity = SerializedSceneState["worlds"][number]["world"]["entities"][number];
type SerializedWorldComponent = SerializedWorldEntity["components"][number];
type IndexedSceneState = {
  snapshot: SerializedSceneState;
  worlds: Map<string, IndexedWorldState>;
};
type IndexedWorldState = {
  snapshot: SerializedSceneWorld;
  entities: Map<EntityId, IndexedEntityState>;
};
type IndexedEntityState = {
  snapshot: SerializedWorldEntity;
  components: Map<string, IndexedComponentState>;
};
type IndexedComponentState = {
  snapshot: SerializedWorldComponent;
};

type WorkerOptions = {
  databaseName: string;
  storeName: string;
  storageKey: string;
  flushIntervalMs: number;
};

type WorkerMessage =
  | {
      type: "configure";
      options: WorkerOptions;
    }
  | {
      type: "load";
      requestId: number;
    }
  | {
      type: "seed";
      state: SerializedSceneState;
    }
  | {
      type: "emit-batch";
      commands: DiffCommand[];
    };

let options: WorkerOptions | null = null;
let state: IndexedSceneState | null = null;
let dirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "configure") {
    options = message.options;
    return;
  }

  if (!options) {
    postError(new Error("IndexedDbWorkerBackend used before configure"));
    return;
  }

  if (message.type === "load") {
    try {
      const storedState = await readStoredSceneState(options);
      if (storedState) {
        normalizeSnapshotOrdering(storedState);
        state = buildIndexedSceneState(storedState);
      }

      self.postMessage({
        type: "loaded",
        requestId: message.requestId,
        state: storedState,
        hasStoredState: storedState !== null,
      });
    } catch (error) {
      postError(error);
    }
    return;
  }

  if (message.type === "seed") {
    normalizeSnapshotOrdering(message.state);
    state = buildIndexedSceneState(message.state);
    dirty = false;
    clearFlushTimer();
    return;
  }

  if (!state) {
    return;
  }

  try {
    for (const command of message.commands) {
      applyCommand(state, command);
    }

    dirty = true;
    scheduleFlush();
  } catch (error) {
    postError(error);
  }
});

function scheduleFlush(): void {
  if (!options || flushTimer !== null) {
    return;
  }

  flushTimer = setTimeout(async () => {
    flushTimer = null;

    if (!options || !state || !dirty) {
      return;
    }

    try {
      await writeStoredSceneState(options, state.snapshot);
      dirty = false;
      self.postMessage({ type: "flushed" });
    } catch (error) {
      postError(error);
    }
  }, options.flushIntervalMs);
}

function clearFlushTimer(): void {
  if (flushTimer === null) {
    return;
  }

  clearTimeout(flushTimer);
  flushTimer = null;
}

function postError(error: unknown): void {
  self.postMessage({ type: "error", error });
}

function readStoredSceneState(options: WorkerOptions): Promise<SerializedSceneState | null> {
  return withStore(options, "readonly", (store) => requestToPromise(store.get(options.storageKey)));
}

function writeStoredSceneState(options: WorkerOptions, snapshot: SerializedSceneState): Promise<void> {
  return withStore(options, "readwrite", async (store) => {
    await requestToPromise(store.put(snapshot, options.storageKey));
  });
}

async function withStore<T>(
  workerOptions: WorkerOptions,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const database = await openDatabase(workerOptions);

  try {
    const transaction = database.transaction(workerOptions.storeName, mode);
    const store = transaction.objectStore(workerOptions.storeName);
    const result = await callback(store);
    await transactionComplete(transaction);
    return result;
  } finally {
    database.close();
  }
}

function openDatabase(workerOptions: WorkerOptions): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(workerOptions.databaseName, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(workerOptions.storeName)) {
        database.createObjectStore(workerOptions.storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function buildIndexedSceneState(snapshot: SerializedSceneState): IndexedSceneState {
  const worlds = new Map<string, IndexedWorldState>();

  for (const sceneWorld of snapshot.worlds) {
    worlds.set(sceneWorld.worldId, buildIndexedWorldState(sceneWorld));
  }

  return {
    snapshot,
    worlds,
  };
}

function buildIndexedWorldState(snapshot: SerializedSceneWorld): IndexedWorldState {
  const entities = new Map<EntityId, IndexedEntityState>();

  for (const entity of snapshot.world.entities) {
    entities.set(entity.entityId, buildIndexedEntityState(entity));
  }

  return {
    snapshot,
    entities,
  };
}

function buildIndexedEntityState(snapshot: SerializedWorldEntity): IndexedEntityState {
  const components = new Map<string, IndexedComponentState>();

  for (const component of snapshot.components) {
    components.set(component.type, {
      snapshot: component,
    });
  }

  return {
    snapshot,
    components,
  };
}

function applyCommand(state: IndexedSceneState, command: DiffCommand): void {
  switch (command.op) {
    case "create-entity": {
      const world = ensureWorldState(state, command.worldId);
      ensureEntityState(world, command.entityId);
      return;
    }
    case "destroy-entity": {
      const world = state.worlds.get(command.worldId);
      if (!world) {
        return;
      }

      removeEntityState(world, command.entityId);
      return;
    }
    case "add-component": {
      const world = ensureWorldState(state, command.worldId);
      const entity = ensureEntityState(world, command.entityId);
      upsertComponentState(entity, command.componentType, command.data);
      return;
    }
    case "remove-component": {
      const world = state.worlds.get(command.worldId);
      if (!world) {
        return;
      }

      const entity = world.entities.get(command.entityId);
      if (!entity) {
        return;
      }

      removeComponentState(entity, command.componentType);
      return;
    }
    case "set-field": {
      const world = state.worlds.get(command.worldId);
      if (!world) {
        return;
      }

      const entity = world.entities.get(command.entityId);
      if (!entity) {
        return;
      }

      const component = entity.components.get(command.componentType);
      if (!component) {
        return;
      }

      for (const fieldKey in command.changes) {
        if (!Object.prototype.hasOwnProperty.call(command.changes, fieldKey)) {
          continue;
        }

        component.snapshot.data[fieldKey] = cloneSerializedValue(command.changes[fieldKey]);
      }
      return;
    }
  }
}

function ensureWorldState(state: IndexedSceneState, worldId: string): IndexedWorldState {
  const existing = state.worlds.get(worldId);
  if (existing) {
    return existing;
  }

  const snapshot: SerializedSceneWorld = {
    worldId,
    world: {
      sceneId: worldId === "default" ? state.snapshot.sceneName : `${state.snapshot.sceneName}:${worldId}`,
      entities: [],
    },
  };
  const worldState: IndexedWorldState = {
    snapshot,
    entities: new Map(),
  };

  state.snapshot.worlds.push(snapshot);
  state.worlds.set(worldId, worldState);
  return worldState;
}

function ensureEntityState(world: IndexedWorldState, entityId: EntityId): IndexedEntityState {
  const existing = world.entities.get(entityId);
  if (existing) {
    return existing;
  }

  const snapshot: SerializedWorldEntity = {
    entityId,
    components: [],
  };
  const entityState: IndexedEntityState = {
    snapshot,
    components: new Map(),
  };

  world.snapshot.world.entities.push(snapshot);
  world.entities.set(entityId, entityState);
  return entityState;
}

function removeEntityState(world: IndexedWorldState, entityId: EntityId): void {
  const entityState = world.entities.get(entityId);
  if (!entityState) {
    return;
  }

  const entityIndex = world.snapshot.world.entities.indexOf(entityState.snapshot);
  if (entityIndex >= 0) {
    world.snapshot.world.entities.splice(entityIndex, 1);
  }

  world.entities.delete(entityId);
}

function upsertComponentState(entity: IndexedEntityState, componentType: string, data: SerializedObject): void {
  const existing = entity.components.get(componentType);
  if (existing) {
    existing.snapshot.data = cloneSerializedObject(data);
    return;
  }

  const snapshot: SerializedWorldComponent = {
    type: componentType,
    data: cloneSerializedObject(data),
  };

  entity.snapshot.components.push(snapshot);
  entity.components.set(componentType, {
    snapshot,
  });
}

function removeComponentState(entity: IndexedEntityState, componentType: string): void {
  const componentState = entity.components.get(componentType);
  if (!componentState) {
    return;
  }

  const componentIndex = entity.snapshot.components.indexOf(componentState.snapshot);
  if (componentIndex >= 0) {
    entity.snapshot.components.splice(componentIndex, 1);
  }

  entity.components.delete(componentType);
}

function normalizeSnapshotOrdering(snapshot: SerializedSceneState): void {
  snapshot.worlds.sort((left, right) => left.worldId.localeCompare(right.worldId));

  for (const sceneWorld of snapshot.worlds) {
    sceneWorld.world.entities.sort((left, right) => left.entityId - right.entityId);

    for (const entity of sceneWorld.world.entities) {
      entity.components.sort((left, right) => left.type.localeCompare(right.type));
    }
  }
}

export {};
