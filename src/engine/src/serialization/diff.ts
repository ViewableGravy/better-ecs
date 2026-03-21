import { fromEngine, registeredEngine } from "@engine/core/global-engine";
import type { SceneContext } from "@engine/core/scene/scene-context";
import type { Component } from "@engine/ecs/component";
import type { EntityId } from "@engine/ecs/entity";
import {
    applySerializedChanges,
    createSerializableComponentInstance,
    getSerializableComponentConstructor,
    type SerializableComponentInstance,
} from "@engine/serialization/serializableComponent";
import type { SerializedObject, SerializedValue } from "@engine/serialization/state";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type DiffCommand =
  | {
      op: "create-entity";
      version: number;
      worldId: string;
      entityId: EntityId;
    }
  | {
      op: "destroy-entity";
      version: number;
      worldId: string;
      entityId: EntityId;
    }
  | {
      op: "add-component";
      version: number;
      worldId: string;
      entityId: EntityId;
      componentType: string;
      data: SerializedObject;
    }
  | {
      op: "remove-component";
      version: number;
      worldId: string;
      entityId: EntityId;
      componentType: string;
    }
  | {
      op: "set-field";
      version: number;
      worldId: string;
      entityId: EntityId;
      componentType: string;
      changes: Record<string, SerializedValue>;
    };

export class DiffManager {
  static applyCommands(scene: SceneContext, commands: readonly DiffCommand[]): void {
    const applied = () => {
      for (const command of commands) {
        DiffManager.applyCommand(scene, command);
      }
    };

    if (!registeredEngine) {
      applied();
      return;
    }

    fromEngine((engine) => {
      engine.serialization.suspendTracking(applied);
    });
  }

  static serializeToJSON(commands: readonly DiffCommand[]): string {
    return JSON.stringify(commands);
  }

  static deserializeFromJSON(json: string): DiffCommand[] {
    return JSON.parse(json) as DiffCommand[];
  }

  static serializeToBinary(commands: readonly DiffCommand[]): ArrayBuffer {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(DiffManager.serializeToJSON(commands));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  static deserializeFromBinary(buffer: ArrayBuffer): DiffCommand[] {
    const decoder = new TextDecoder();
    return DiffManager.deserializeFromJSON(decoder.decode(new Uint8Array(buffer)));
  }

  private static applyCommand(scene: SceneContext, command: DiffCommand): void {
    const world = scene.requireWorld(command.worldId);

    switch (command.op) {
      case "create-entity":
        world.createWithId(command.entityId);
        return;
      case "destroy-entity":
        world.destroy(command.entityId);
        return;
      case "add-component": {
        const component = createSerializableComponentInstance(command.componentType);
        applySerializedChanges(component, command.data);
        world.add(command.entityId, component as Component);
        return;
      }
      case "remove-component": {
        const componentType = getSerializableComponentConstructor(command.componentType);
        world.remove(command.entityId, componentType);
        return;
      }
      case "set-field": {
        const componentType = getSerializableComponentConstructor(command.componentType);
        const component = world.require(command.entityId, componentType) as SerializableComponentInstance;
        applySerializedChanges(component, command.changes);
        return;
      }
    }
  }
}