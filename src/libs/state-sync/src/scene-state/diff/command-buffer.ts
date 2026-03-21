import { encodeEntityId, type DiffCommand, type EntityId, type SerializedObject, type SerializedValue } from "@engine";

type CreateEntityCommand = Extract<DiffCommand, { op: "create-entity" }>;
type DestroyEntityCommand = Extract<DiffCommand, { op: "destroy-entity" }>;
type AddComponentCommand = Extract<DiffCommand, { op: "add-component" }>;
type RemoveComponentCommand = Extract<DiffCommand, { op: "remove-component" }>;
type SetFieldCommand = Extract<DiffCommand, { op: "set-field" }>;

const PLACEHOLDER_ENTITY_ID = encodeEntityId(0, 0);

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class SceneStateDiffCommandBuffer {
  readonly #commands: DiffCommand[] = [];
  readonly #createEntityPool: CreateEntityCommand[] = [];
  readonly #destroyEntityPool: DestroyEntityCommand[] = [];
  readonly #addComponentPool: AddComponentCommand[] = [];
  readonly #removeComponentPool: RemoveComponentCommand[] = [];
  readonly #setFieldPool: SetFieldCommand[] = [];

  #version = 0;
  #createEntityIndex = 0;
  #destroyEntityIndex = 0;
  #addComponentIndex = 0;
  #removeComponentIndex = 0;
  #setFieldIndex = 0;

  begin(startingVersion: number = 0): void {
    this.#commands.length = 0;
    this.#version = startingVersion;
    this.#createEntityIndex = 0;
    this.#destroyEntityIndex = 0;
    this.#addComponentIndex = 0;
    this.#removeComponentIndex = 0;
    this.#setFieldIndex = 0;
  }

  finish(): readonly DiffCommand[] {
    return this.#commands;
  }

  pushCreateEntity(worldId: string, entityId: EntityId): void {
    const command = this.acquireCreateEntity();
    command.version = this.nextVersion();
    command.worldId = worldId;
    command.entityId = entityId;
    this.#commands.push(command);
  }

  pushDestroyEntity(worldId: string, entityId: EntityId): void {
    const command = this.acquireDestroyEntity();
    command.version = this.nextVersion();
    command.worldId = worldId;
    command.entityId = entityId;
    this.#commands.push(command);
  }

  pushAddComponent(worldId: string, entityId: EntityId, componentType: string, data: SerializedObject): void {
    const command = this.acquireAddComponent();
    command.version = this.nextVersion();
    command.worldId = worldId;
    command.entityId = entityId;
    command.componentType = componentType;
    command.data = data;
    this.#commands.push(command);
  }

  pushRemoveComponent(worldId: string, entityId: EntityId, componentType: string): void {
    const command = this.acquireRemoveComponent();
    command.version = this.nextVersion();
    command.worldId = worldId;
    command.entityId = entityId;
    command.componentType = componentType;
    this.#commands.push(command);
  }

  pushSetField(
    worldId: string,
    entityId: EntityId,
    componentType: string,
    changes: Record<string, SerializedValue>,
  ): void {
    const command = this.acquireSetField();
    command.version = this.nextVersion();
    command.worldId = worldId;
    command.entityId = entityId;
    command.componentType = componentType;
    resetRecord(command.changes);

    for (const fieldKey in changes) {
      if (Object.prototype.hasOwnProperty.call(changes, fieldKey)) {
        command.changes[fieldKey] = changes[fieldKey];
      }
    }

    this.#commands.push(command);
  }

  private nextVersion(): number {
    this.#version += 1;
    return this.#version;
  }

  private acquireCreateEntity(): CreateEntityCommand {
    const index = this.#createEntityIndex;
    let command = this.#createEntityPool[index];

    if (!command) {
      command = {
        op: "create-entity",
        version: 0,
        worldId: "",
        entityId: PLACEHOLDER_ENTITY_ID,
      };
      this.#createEntityPool.push(command);
    }

    this.#createEntityIndex = index + 1;
    return command;
  }

  private acquireDestroyEntity(): DestroyEntityCommand {
    const index = this.#destroyEntityIndex;
    let command = this.#destroyEntityPool[index];

    if (!command) {
      command = {
        op: "destroy-entity",
        version: 0,
        worldId: "",
        entityId: PLACEHOLDER_ENTITY_ID,
      };
      this.#destroyEntityPool.push(command);
    }

    this.#destroyEntityIndex = index + 1;
    return command;
  }

  private acquireAddComponent(): AddComponentCommand {
    const index = this.#addComponentIndex;
    let command = this.#addComponentPool[index];

    if (!command) {
      command = {
        op: "add-component",
        version: 0,
        worldId: "",
        entityId: PLACEHOLDER_ENTITY_ID,
        componentType: "",
        data: {},
      };
      this.#addComponentPool.push(command);
    }

    this.#addComponentIndex = index + 1;
    return command;
  }

  private acquireRemoveComponent(): RemoveComponentCommand {
    const index = this.#removeComponentIndex;
    let command = this.#removeComponentPool[index];

    if (!command) {
      command = {
        op: "remove-component",
        version: 0,
        worldId: "",
        entityId: PLACEHOLDER_ENTITY_ID,
        componentType: "",
      };
      this.#removeComponentPool.push(command);
    }

    this.#removeComponentIndex = index + 1;
    return command;
  }

  private acquireSetField(): SetFieldCommand {
    const index = this.#setFieldIndex;
    let command = this.#setFieldPool[index];

    if (!command) {
      command = {
        op: "set-field",
        version: 0,
        worldId: "",
        entityId: PLACEHOLDER_ENTITY_ID,
        componentType: "",
        changes: {},
      };
      this.#setFieldPool.push(command);
    }

    this.#setFieldIndex = index + 1;
    return command;
  }
}

function resetRecord(record: Record<string, SerializedValue>): void {
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      delete record[key];
    }
  }
}