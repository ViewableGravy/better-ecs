import type { DiffCommand, SerializedValue, SerializedWorld, SerializedWorldComponent, SerializedWorldEntity } from "@engine";
import { SceneStateDiffCommandBuffer } from "@libs/state-sync/scene-state/diff/command-buffer";
import { cloneSerializedObject, cloneSerializedValue, serializedValuesEqual } from "@libs/state-sync/scene-state/serialize/serialize-value";
import type { SerializedSceneState } from "@libs/state-sync/scene-state/types";

const defaultCommandBuffer = new SceneStateDiffCommandBuffer();
const pendingChanges: Record<string, SerializedValue> = {};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

/**
 * Create diff commands that transform the current serialized scene state into the target scene state.
 *
 * The returned array is backed by a reusable internal command buffer to keep startup hydrate work
 * allocation-light. Callers should consume the result synchronously and not retain it across later calls.
 */
export function createDiffCommandsForSceneStateDelta(
  current: SerializedSceneState,
  target: SerializedSceneState,
  startingVersion: number = 0,
): readonly DiffCommand[] {
  return diffWithBuffer(defaultCommandBuffer, current, target, startingVersion);
}

/**
 * Create a reusable diff driver with its own command buffer.
 */
export function createSceneStateDiffCommandBuffer() {
  const buffer = new SceneStateDiffCommandBuffer();

  return {
    /**
     * Reuse the same pooled command buffer across multiple diff runs.
     */
    diff(current: SerializedSceneState, target: SerializedSceneState, startingVersion: number = 0): readonly DiffCommand[] {
      return diffWithBuffer(buffer, current, target, startingVersion);
    },
  };
}

/**
 * Run a scene-state diff using a caller-provided pooled command buffer.
 */
function diffWithBuffer(
  buffer: SceneStateDiffCommandBuffer,
  current: SerializedSceneState,
  target: SerializedSceneState,
  startingVersion: number,
): readonly DiffCommand[] {
  buffer.begin(startingVersion);
  diffWorlds(buffer, current, target);
  return buffer.finish();
}

/**
 * Diff sorted world lists with a two-pointer walk so we avoid temporary maps, sets, and merged arrays.
 */
function diffWorlds(
  buffer: SceneStateDiffCommandBuffer,
  current: SerializedSceneState,
  target: SerializedSceneState,
): void {
  let currentIndex = 0;
  let targetIndex = 0;

  while (currentIndex < current.worlds.length || targetIndex < target.worlds.length) {
    const currentWorld = current.worlds[currentIndex];
    const targetWorld = target.worlds[targetIndex];

    if (!currentWorld && targetWorld) {
      bootstrapWorld(buffer, targetWorld.worldId, targetWorld.world);
      targetIndex += 1;
      continue;
    }

    if (currentWorld && !targetWorld) {
      destroyWorld(buffer, currentWorld.worldId, currentWorld.world);
      currentIndex += 1;
      continue;
    }

    if (!currentWorld || !targetWorld) {
      break;
    }

    const comparison = currentWorld.worldId.localeCompare(targetWorld.worldId);
    if (comparison < 0) {
      destroyWorld(buffer, currentWorld.worldId, currentWorld.world);
      currentIndex += 1;
      continue;
    }

    if (comparison > 0) {
      bootstrapWorld(buffer, targetWorld.worldId, targetWorld.world);
      targetIndex += 1;
      continue;
    }

    diffEntities(buffer, currentWorld.worldId, currentWorld.world, targetWorld.world);
    currentIndex += 1;
    targetIndex += 1;
  }
}

/**
 * Emit commands to bootstrap a world that only exists in the target state.
 */
function bootstrapWorld(buffer: SceneStateDiffCommandBuffer, worldId: string, world: SerializedWorld): void {
  for (const entity of world.entities) {
    buffer.pushCreateEntity(worldId, entity.entityId);

    for (const component of entity.components) {
      buffer.pushAddComponent(worldId, entity.entityId, component.type, cloneSerializedObject(component.data));
    }
  }
}

/**
 * Emit commands to destroy a world that only exists in the current state.
 */
function destroyWorld(buffer: SceneStateDiffCommandBuffer, worldId: string, world: SerializedWorld): void {
  for (const entity of world.entities) {
    buffer.pushDestroyEntity(worldId, entity.entityId);
  }
}

/**
 * Diff sorted entity lists within a world.
 */
function diffEntities(
  buffer: SceneStateDiffCommandBuffer,
  worldId: string,
  currentWorld: SerializedWorld,
  targetWorld: SerializedWorld,
): void {
  let currentIndex = 0;
  let targetIndex = 0;

  while (currentIndex < currentWorld.entities.length || targetIndex < targetWorld.entities.length) {
    const currentEntity = currentWorld.entities[currentIndex];
    const targetEntity = targetWorld.entities[targetIndex];

    if (!currentEntity && targetEntity) {
      buffer.pushCreateEntity(worldId, targetEntity.entityId);
      for (const component of targetEntity.components) {
        buffer.pushAddComponent(worldId, targetEntity.entityId, component.type, cloneSerializedObject(component.data));
      }
      targetIndex += 1;
      continue;
    }

    if (currentEntity && !targetEntity) {
      buffer.pushDestroyEntity(worldId, currentEntity.entityId);
      currentIndex += 1;
      continue;
    }

    if (!currentEntity || !targetEntity) {
      break;
    }

    if (currentEntity.entityId < targetEntity.entityId) {
      buffer.pushDestroyEntity(worldId, currentEntity.entityId);
      currentIndex += 1;
      continue;
    }

    if (currentEntity.entityId > targetEntity.entityId) {
      buffer.pushCreateEntity(worldId, targetEntity.entityId);
      for (const component of targetEntity.components) {
        buffer.pushAddComponent(worldId, targetEntity.entityId, component.type, cloneSerializedObject(component.data));
      }
      targetIndex += 1;
      continue;
    }

    diffComponents(buffer, worldId, currentEntity, targetEntity);
    currentIndex += 1;
    targetIndex += 1;
  }
}

/**
 * Diff sorted component lists for a single entity.
 */
function diffComponents(
  buffer: SceneStateDiffCommandBuffer,
  worldId: string,
  currentEntity: SerializedWorldEntity,
  targetEntity: SerializedWorldEntity,
): void {
  let currentIndex = 0;
  let targetIndex = 0;

  while (currentIndex < currentEntity.components.length || targetIndex < targetEntity.components.length) {
    const currentComponent = currentEntity.components[currentIndex];
    const targetComponent = targetEntity.components[targetIndex];

    if (!currentComponent && targetComponent) {
      buffer.pushAddComponent(worldId, targetEntity.entityId, targetComponent.type, cloneSerializedObject(targetComponent.data));
      targetIndex += 1;
      continue;
    }

    if (currentComponent && !targetComponent) {
      buffer.pushRemoveComponent(worldId, currentEntity.entityId, currentComponent.type);
      currentIndex += 1;
      continue;
    }

    if (!currentComponent || !targetComponent) {
      break;
    }

    const comparison = currentComponent.type.localeCompare(targetComponent.type);
    if (comparison < 0) {
      buffer.pushRemoveComponent(worldId, currentEntity.entityId, currentComponent.type);
      currentIndex += 1;
      continue;
    }

    if (comparison > 0) {
      buffer.pushAddComponent(worldId, targetEntity.entityId, targetComponent.type, cloneSerializedObject(targetComponent.data));
      targetIndex += 1;
      continue;
    }

    if (collectComponentChanges(currentComponent, targetComponent)) {
      buffer.pushSetField(worldId, currentEntity.entityId, currentComponent.type, pendingChanges);
      clearPendingChanges();
    }

    currentIndex += 1;
    targetIndex += 1;
  }
}

/**
 * Collect changed top-level serialized fields into a reusable scratch record.
 */
function collectComponentChanges(
  currentComponent: SerializedWorldComponent,
  targetComponent: SerializedWorldComponent,
): boolean {
  let hasChanges = false;

  for (const fieldName in targetComponent.data) {
    if (!Object.prototype.hasOwnProperty.call(targetComponent.data, fieldName)) {
      continue;
    }

    const targetValue = targetComponent.data[fieldName];
    const currentValue = currentComponent.data[fieldName];
    if (currentValue !== undefined && serializedValuesEqual(currentValue, targetValue)) {
      continue;
    }

    pendingChanges[fieldName] = cloneSerializedValue(targetValue);
    hasChanges = true;
  }

  return hasChanges;
}

function clearPendingChanges(): void {
  for (const fieldName in pendingChanges) {
    if (Object.prototype.hasOwnProperty.call(pendingChanges, fieldName)) {
      delete pendingChanges[fieldName];
    }
  }
}