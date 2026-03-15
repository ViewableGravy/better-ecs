import type {
    EntityId,
    SerializedObject,
    SerializedWorld,
    SerializedWorldComponent,
    SerializedWorldEntity,
} from "@engine";
import { cloneSerializedObject } from "@libs/state-sync/scene-state/serialize/serialize-value";
import type { SerializedSceneState, SerializedSceneWorld } from "@libs/state-sync/scene-state/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getWorldState(state: SerializedSceneState, worldId: string): SerializedSceneWorld | undefined {
  for (const world of state.worlds) {
    if (world.worldId === worldId) {
      return world;
    }
  }

  return undefined;
}

export function ensureWorldState(state: SerializedSceneState, worldId: string): SerializedSceneWorld {
  const existing = getWorldState(state, worldId);
  if (existing) {
    return existing;
  }

  const world: SerializedSceneWorld = {
    worldId,
    world: {
      sceneId: worldId === "default" ? state.sceneName : `${state.sceneName}:${worldId}`,
      entities: [],
    },
  };

  const insertIndex = findWorldInsertIndex(state.worlds, worldId);
  state.worlds.splice(insertIndex, 0, world);
  return world;
}

export function requireWorldState(state: SerializedSceneState, worldId: string): SerializedSceneWorld {
  const world = getWorldState(state, worldId);
  if (!world) {
    throw new Error(`Cannot apply diff for missing world "${worldId}"`);
  }

  return world;
}

export function ensureEntityState(world: SerializedWorld, entityId: EntityId): SerializedWorldEntity {
  const existing = getEntityState(world, entityId);
  if (existing) {
    return existing;
  }

  const entity: SerializedWorldEntity = {
    entityId,
    components: [],
  };

  const insertIndex = findEntityInsertIndex(world.entities, entityId);
  world.entities.splice(insertIndex, 0, entity);
  return entity;
}

export function requireEntityState(world: SerializedWorld, entityId: EntityId): SerializedWorldEntity {
  const entity = getEntityState(world, entityId);
  if (!entity) {
    throw new Error(`Cannot apply diff for missing entity ${entityId}`);
  }

  return entity;
}

export function requireComponentState(entity: SerializedWorldEntity, componentType: string): SerializedWorldComponent {
  const component = getComponentState(entity, componentType);
  if (!component) {
    throw new Error(`Cannot apply diff for missing component "${componentType}" on entity ${entity.entityId}`);
  }

  return component;
}

export function upsertComponentState(
  entity: SerializedWorldEntity,
  componentType: string,
  data: SerializedObject,
): void {
  const existing = getComponentState(entity, componentType);
  if (existing) {
    existing.data = cloneSerializedObject(data);
    return;
  }

  const insertIndex = findComponentInsertIndex(entity.components, componentType);
  entity.components.splice(insertIndex, 0, {
    type: componentType,
    data: cloneSerializedObject(data),
  });
}

function getEntityState(world: SerializedWorld, entityId: EntityId): SerializedWorldEntity | undefined {
  for (const entity of world.entities) {
    if (entity.entityId === entityId) {
      return entity;
    }
  }

  return undefined;
}

function getComponentState(entity: SerializedWorldEntity, componentType: string): SerializedWorldComponent | undefined {
  for (const component of entity.components) {
    if (component.type === componentType) {
      return component;
    }
  }

  return undefined;
}

function findWorldInsertIndex(worlds: SerializedSceneWorld[], worldId: string): number {
  let index = 0;

  while (index < worlds.length && worlds[index] && worlds[index].worldId.localeCompare(worldId) < 0) {
    index += 1;
  }

  return index;
}

function findEntityInsertIndex(entities: SerializedWorldEntity[], entityId: EntityId): number {
  let index = 0;

  while (index < entities.length && entities[index] && entities[index].entityId < entityId) {
    index += 1;
  }

  return index;
}

function findComponentInsertIndex(components: SerializedWorldComponent[], componentType: string): number {
  let index = 0;

  while (index < components.length && components[index] && components[index].type.localeCompare(componentType) < 0) {
    index += 1;
  }

  return index;
}