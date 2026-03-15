import type { DiffCommand, EntityId, SerializedObject } from "@engine";
import {
    readStoredSceneState,
    writeStoredSceneState,
} from "@libs/state-sync/adapters/local-storage/backend/storage";
import type {
    LocalStorageAdapterOptions,
    LocalStorageBackendEvent,
    LocalStorageBackendListener,
} from "@libs/state-sync/adapters/local-storage/types";
import { StateSyncCommandBuffer } from "@libs/state-sync/command/buffer";
import type { SerializedSceneState, SerializedSceneWorld } from "@libs/state-sync/scene-state";
import { cloneSerializedObject, cloneSerializedValue } from "@libs/state-sync/scene-state/serialize/serialize-value";
import type { StateSyncBackend } from "@libs/state-sync/types";

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
type ListenerMap = {
  [TType in LocalStorageBackendEvent["type"]]: Set<LocalStorageBackendListener<TType>>;
};

const DEFAULT_FLUSH_INTERVAL_MS = 1000;
const DEFAULT_FRAME_BUDGET_MS = 0.5;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class LocalStorageBackend implements StateSyncBackend<SerializedSceneState, DiffCommand, LocalStorageBackendEvent> {
  static #instance: LocalStorageBackend | null = null;

  readonly #commandBuffer = new StateSyncCommandBuffer();
  readonly #listeners: ListenerMap = {
    loaded: new Set(),
    flushed: new Set(),
    error: new Set(),
  };
  readonly #flushIntervalMs: number;
  readonly #frameBudgetMs: number;

  #state: IndexedSceneState | null = null;
  #dirty = false;
  #flushRequested = false;
  #processTimer: ReturnType<typeof setTimeout> | null = null;
  #flushTimer: ReturnType<typeof setTimeout> | null = null;

  public static instance(options: LocalStorageAdapterOptions): LocalStorageBackend {
    if (!this.#instance) {
      this.#instance = new LocalStorageBackend(options);
      return this.#instance;
    }

    this.#instance.assertCompatibleOptions(options);
    return this.#instance;
  }

  public static resetForTests(): void {
    this.#instance = null;
  }

  constructor(private readonly options: LocalStorageAdapterOptions) {
    this.#flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.#frameBudgetMs = options.frameBudgetMs ?? DEFAULT_FRAME_BUDGET_MS;
  }

  private assertCompatibleOptions(options: LocalStorageAdapterOptions): void {
    if (options.storageKey !== this.options.storageKey) {
      throw new Error(
        `LocalStorageBackend singleton already configured for key "${this.options.storageKey}", received "${options.storageKey}"`,
      );
    }
  }

  async load(): Promise<SerializedSceneState | null> {
    const stored = await readStoredSceneState(this.options);

    if (stored.state) {
      normalizeSnapshotOrdering(stored.state);
      this.seed(stored.state);
    }

    this.emitEvent("loaded", { type: "loaded", hasStoredState: stored.state !== null });
    return stored.state;
  }

  seed(state: SerializedSceneState): void {
    normalizeSnapshotOrdering(state);
    this.#state = buildIndexedSceneState(state);
    this.#dirty = false;
    this.#flushRequested = false;
    this.clearFlushTimer();
  }

  emit(command: DiffCommand): void {
    this.#commandBuffer.push(command);
    this.scheduleProcess();
    this.scheduleFlush();
  }

  on<TType extends LocalStorageBackendEvent["type"]>(
    type: TType,
    listener: LocalStorageBackendListener<TType>,
  ): () => void {
    const listeners = this.#listeners[type] as Set<LocalStorageBackendListener<TType>>;
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  private scheduleProcess(): void {
    if (this.#processTimer !== null) {
      return;
    }

    this.#processTimer = setTimeout(() => {
      this.#processTimer = null;
      this.processWithinBudget();
    }, 0);
  }

  private scheduleFlush(): void {
    if (this.#flushTimer !== null) {
      return;
    }

    this.#flushTimer = setTimeout(() => {
      this.#flushTimer = null;
      this.#flushRequested = true;
      this.scheduleProcess();
    }, this.#flushIntervalMs);
  }

  private clearFlushTimer(): void {
    if (this.#flushTimer === null) {
      return;
    }

    clearTimeout(this.#flushTimer);
    this.#flushTimer = null;
  }

  private processWithinBudget(): void {
    const state = this.#state;
    if (!state) {
      return;
    }

    try {
      this.#commandBuffer.consumeWithinBudget((command) => {
        applyCommand(state, command);
        this.#dirty = true;
      }, this.#frameBudgetMs);
    } catch (error) {
      this.emitEvent("error", { type: "error", error });
      return;
    }

    if (this.#commandBuffer.size > 0) {
      this.scheduleProcess();
      return;
    }

    if (!this.#flushRequested || !this.#dirty) {
      return;
    }

    this.flush();
  }

  private flush(): void {
    const state = this.#state;
    if (!state) {
      return;
    }

    try {
      writeStoredSceneState(this.options, state.snapshot);
      this.#dirty = false;
      this.#flushRequested = false;
      this.emitEvent("flushed", { type: "flushed" });
    } catch (error) {
      this.emitEvent("error", { type: "error", error });
    }
  }

  private emitEvent<TType extends LocalStorageBackendEvent["type"]>(
    type: TType,
    event: Extract<LocalStorageBackendEvent, { type: TType }>,
  ): void {
    const listeners = this.#listeners[type] as Set<LocalStorageBackendListener<TType>>;

    for (const listener of listeners) {
      listener(event);
    }
  }
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
      break;
    }
    case "destroy-entity": {
      const world = state.worlds.get(command.worldId);
      if (!world) {
        return;
      }

      removeEntityState(world, command.entityId);
      break;
    }
    case "add-component": {
      const world = ensureWorldState(state, command.worldId);
      const entity = ensureEntityState(world, command.entityId);
      upsertComponentState(entity, command.componentType, command.data);
      break;
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
      break;
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
        if (Object.prototype.hasOwnProperty.call(command.changes, fieldKey)) {
          component.snapshot.data[fieldKey] = cloneSerializedValue(command.changes[fieldKey]);
        }
      }

      break;
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

function upsertComponentState(
  entity: IndexedEntityState,
  componentType: string,
  data: SerializedObject,
): void {
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