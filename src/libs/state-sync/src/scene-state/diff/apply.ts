import type { DiffCommand } from "@engine";
import {
    ensureEntityState,
    ensureWorldState,
    requireComponentState,
    requireEntityState,
    requireWorldState,
    upsertComponentState,
} from "@libs/state-sync/scene-state/diff/utils";
import { cloneSerializedValue } from "@libs/state-sync/scene-state/serialize/serialize-value";
import type { SerializedSceneState } from "@libs/state-sync/scene-state/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function applyDiffCommandsToSceneState(
  state: SerializedSceneState,
  commands: readonly DiffCommand[],
): SerializedSceneState {
  for (const command of commands) {
    switch (command.op) {
      case "create-entity": {
        const world = ensureWorldState(state, command.worldId);
        ensureEntityState(world.world, command.entityId);
        break;
      }
      case "destroy-entity": {
        const world = requireWorldState(state, command.worldId);
        world.world.entities = world.world.entities.filter((entity) => entity.entityId !== command.entityId);
        break;
      }
      case "add-component": {
        const world = ensureWorldState(state, command.worldId);
        const entity = ensureEntityState(world.world, command.entityId);
        upsertComponentState(entity, command.componentType, command.data);
        break;
      }
      case "remove-component": {
        const world = requireWorldState(state, command.worldId);
        const entity = requireEntityState(world.world, command.entityId);
        entity.components = entity.components.filter((component) => component.type !== command.componentType);
        break;
      }
      case "set-field": {
        const world = requireWorldState(state, command.worldId);
        const entity = requireEntityState(world.world, command.entityId);
        const component = requireComponentState(entity, command.componentType);

        for (const fieldKey in command.changes) {
          if (Object.prototype.hasOwnProperty.call(command.changes, fieldKey)) {
            component.data[fieldKey] = cloneSerializedValue(command.changes[fieldKey]);
          }
        }

        break;
      }
    }
  }

  return state;
}