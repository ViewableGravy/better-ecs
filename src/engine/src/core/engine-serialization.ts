import type { AnyEngine } from "@engine/core/engine-types";
import type { Component } from "@engine/ecs/component";
import type { EntityId } from "@engine/ecs/entity";
import { DiffManager, type DiffCommand } from "@engine/serialization/diff";
import { Queue } from "@engine/serialization/queue";
import { getSerializableComponentConstructor, isSerializableComponentInstance } from "@engine/serialization/serializableComponent";
import type { SerializedValue } from "@engine/serialization/state";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type EngineSerializationOptions = {
  enableDirtyQueue?: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class EngineSerializationManager {
  readonly #commands = new Queue<DiffCommand>();
  readonly #engine: AnyEngine;

  #version = 0;
  #suspendDepth = 0;
  #dirtyQueueEnabled: boolean;

  constructor(engine: AnyEngine, options?: EngineSerializationOptions) {
    this.#engine = engine;
    this.#dirtyQueueEnabled = options?.enableDirtyQueue ?? false;
  }

  get dirtyQueueEnabled(): boolean {
    return this.#dirtyQueueEnabled;
  }

  get currentVersion(): number {
    return this.#version;
  }

  nextVersion(): number {
    this.#version += 1;
    return this.#version;
  }

  suspendTracking<T>(callback: () => T): T {
    this.#suspendDepth += 1;

    try {
      return callback();
    } finally {
      this.#suspendDepth -= 1;
    }
  }

  shouldTrackMutations(component: Component): boolean {
    return this.#suspendDepth === 0
      && component.isAttached
      && isSerializableComponentInstance(component);
  }

  shouldTrackStructuralMutations(): boolean {
    return this.#suspendDepth === 0;
  }

  recordEntityCreated(worldId: string, entityId: EntityId): void {
    if (!this.shouldTrackStructuralMutations()) {
      return;
    }

    const version = this.nextVersion();
    this.enqueue({ op: "create-entity", version, worldId, entityId });
  }

  recordEntityDestroyed(worldId: string, entityId: EntityId): void {
    if (!this.shouldTrackStructuralMutations()) {
      return;
    }

    const version = this.nextVersion();
    this.enqueue({ op: "destroy-entity", version, worldId, entityId });
  }

  recordComponentAdded(component: Component): void {
    if (!this.shouldTrackStructuralMutations()) {
      return;
    }

    if (!isSerializableComponentInstance(component) || !component.worldId || component.attachedEntityId === undefined) {
      return;
    }

    const version = this.nextVersion();
    component.__markDirty(version);

    this.enqueue({
      op: "add-component",
      version,
      worldId: component.worldId,
      entityId: component.attachedEntityId,
      componentType: component.constructor.name,
      data: component.toJSON(),
    });
  }

  recordComponentRemoved(component: Component): void {
    if (!this.shouldTrackStructuralMutations()) {
      return;
    }

    if (!isSerializableComponentInstance(component) || !component.worldId || component.attachedEntityId === undefined) {
      return;
    }

    const version = this.nextVersion();
    component.__markDirty(version);

    this.enqueue({
      op: "remove-component",
      version,
      worldId: component.worldId,
      entityId: component.attachedEntityId,
      componentType: component.constructor.name,
    });
  }

  recordFieldChange(component: Component, fieldKey: string, serializedValue: SerializedValue): void {
    if (!this.shouldTrackMutations(component) || !component.worldId || component.attachedEntityId === undefined) {
      return;
    }

    const version = this.nextVersion();
    component.__markDirty(version);

    this.enqueue({
      op: "set-field",
      version,
      worldId: component.worldId,
      entityId: component.attachedEntityId,
      componentType: component.constructor.name,
      changes: { [fieldKey]: serializedValue },
    });
  }

  peekDiffCommands(): readonly DiffCommand[] {
    return this.#commands.peek();
  }

  drainDiffCommands(): DiffCommand[] {
    const commands = this.#commands.drain();
    if (commands.length === 0) {
      return commands;
    }

    const latestVersions = new Map<string, number>();

    for (const command of commands) {
      if (command.op !== "set-field" && command.op !== "add-component") {
        continue;
      }

      latestVersions.set(this.getComponentCommandKey(command.worldId, command.entityId, command.componentType), command.version);
    }

    for (const [key, version] of latestVersions) {
      const [worldId, entityIdValue, componentTypeName] = key.split("::");
      const componentType = getSerializableComponentConstructor(componentTypeName);
      const world = this.#engine.scene.context.getWorld(worldId);
      if (!world) {
        continue;
      }

      const entityId = Number(entityIdValue) as EntityId;
      const component = world.get(entityId, componentType) as Component | undefined;
      component?.__clearDirty(version);
    }

    return commands;
  }

  serializeDiffCommandsToJSON(commands: readonly DiffCommand[] = this.peekDiffCommands()): string {
    return DiffManager.serializeToJSON(commands);
  }

  serializeDiffCommandsToBinary(commands: readonly DiffCommand[] = this.peekDiffCommands()): ArrayBuffer {
    return DiffManager.serializeToBinary(commands);
  }

  deserializeDiffCommandsFromJSON(json: string): DiffCommand[] {
    return DiffManager.deserializeFromJSON(json);
  }

  deserializeDiffCommandsFromBinary(buffer: ArrayBuffer): DiffCommand[] {
    return DiffManager.deserializeFromBinary(buffer);
  }

  applyDiffCommands(commands: readonly DiffCommand[]): void {
    DiffManager.applyCommands(this.#engine.scene.context, commands);
  }

  private enqueue(command: DiffCommand): void {
    if (!this.#dirtyQueueEnabled) {
      return;
    }

    this.#commands.enqueue(command);
  }

  private getComponentCommandKey(worldId: string, entityId: EntityId, componentType: string): string {
    return `${worldId}::${entityId}::${componentType}`;
  }
}