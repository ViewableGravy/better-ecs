import { fromEngine, registeredEngine } from "@engine/core/global-engine";
import { Component } from "@engine/ecs/component";
import {
    getSerializableComponentConstructor as getRegisteredSerializableComponentConstructor,
    getSerializableFields,
    isRecord,
    materializeSerializedValue,
    registerSerializableComponentConstructor,
    type SerializableComponentConstructor,
    type SerializedObject,
    type SerializedValue,
} from "@engine/serialization/state";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SerializableComponentMethods = {
  to(type: "json" | "binary"): SerializedObject | ArrayBuffer;
  toJSON(): SerializedObject;
  __afterDeserialized(): void;
  onAfterDeserialized?(): void;
};

export type SerializableComponentInstance = Component & SerializableComponentMethods;

function serializeRecordValue(value: Record<string, unknown>): SerializedObject {
  const result: SerializedObject = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    result[key] = serializeValue(nestedValue);
  }

  return result;
}

function toBinary(component: SerializableComponentInstance): ArrayBuffer {
  const fields = getSerializableFields(component.constructor as Function);

  let size = 0;
  for (const { property, type } of fields) {
    const value = (component as unknown as Record<string, unknown>)[property];

    switch (type) {
      case "u8":
      case "boolean":
        size += 1;
        break;
      case "u16":
        size += 2;
        break;
      case "u32":
      case "int":
      case "f32":
        size += 4;
        break;
      case "f64":
      case "float":
      case "bigint":
        size += 8;
        break;
      case "string": {
        const stringValue = String(value ?? "");
        size += 4 + stringValue.length;
        break;
      }
      case "json":
        throw new Error(`Binary serialization does not support json field "${property}"`);
    }
  }

  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let offset = 0;

  for (const { property, type } of fields) {
    const value = (component as unknown as Record<string, unknown>)[property];

    switch (type) {
      case "u8":
        view.setUint8(offset, Number(value));
        offset += 1;
        break;
      case "u16":
        view.setUint16(offset, Number(value), true);
        offset += 2;
        break;
      case "u32":
        view.setUint32(offset, Number(value), true);
        offset += 4;
        break;
      case "int":
        view.setInt32(offset, Number(value), true);
        offset += 4;
        break;
      case "f32":
        view.setFloat32(offset, Number(value), true);
        offset += 4;
        break;
      case "f64":
      case "float":
        view.setFloat64(offset, Number(value), true);
        offset += 8;
        break;
      case "bigint":
        view.setBigInt64(
          offset,
          value === undefined || value === null
            ? 0n
            : typeof value === "bigint"
              ? value
              : BigInt(String(value)),
          true,
        );
        offset += 8;
        break;
      case "boolean":
        view.setUint8(offset, value ? 1 : 0);
        offset += 1;
        break;
      case "string": {
        const stringValue = String(value ?? "");
        view.setUint32(offset, stringValue.length, true);
        offset += 4;

        for (let index = 0; index < stringValue.length; index += 1) {
          view.setUint8(offset + index, stringValue.charCodeAt(index));
        }

        offset += stringValue.length;
        break;
      }
      case "json":
        throw new Error(`Binary serialization does not support json field "${property}"`);
    }
  }

  return buffer;
}

function toJSON(component: SerializableComponentInstance): SerializedObject {
  const fields = getSerializableFields(component.constructor as Function);
  const result: SerializedObject = {};

  for (const field of fields) {
    result[field.property] = serializeValue((component as unknown as Record<string, unknown>)[field.property]);
  }

  return result;
}

function attachSerializableMethods<T extends SerializableComponentConstructor>(constructor: T): void {
  const prototype = constructor.prototype as SerializableComponentMethods;

  if (!Object.prototype.hasOwnProperty.call(prototype, "to")) {
    Object.defineProperty(prototype, "to", {
      configurable: true,
      value(this: SerializableComponentInstance, type: "json" | "binary") {
        switch (type) {
          case "json":
            return toJSON(this);
          case "binary":
            return toBinary(this);
          default:
            throw new Error(`Unsupported serialization type: ${type}`);
        }
      },
    });
  }

  if (!Object.prototype.hasOwnProperty.call(prototype, "toJSON")) {
    Object.defineProperty(prototype, "toJSON", {
      configurable: true,
      value(this: SerializableComponentInstance) {
        return toJSON(this);
      },
    });
  }

  if (!Object.prototype.hasOwnProperty.call(prototype, "__afterDeserialized")) {
    Object.defineProperty(prototype, "__afterDeserialized", {
      configurable: true,
      value(this: SerializableComponentInstance) {
        this.onAfterDeserialized?.();
      },
    });
  }
}

export function SerializableComponent<T extends SerializableComponentConstructor>(constructor: T): T {
  registerSerializableComponentConstructor(constructor);
  attachSerializableMethods(constructor);
  return constructor;
}

export function isSerializableComponentInstance(value: unknown): value is SerializableComponentInstance {
  if (!(value instanceof Component)) {
    return false;
  }

  try {
    getRegisteredSerializableComponentConstructor(value.constructor.name);
    return true;
  } catch {
    return false;
  }
}

export function getSerializableComponentConstructor(name: string): SerializableComponentConstructor {
  return getRegisteredSerializableComponentConstructor(name);
}

export function createSerializableComponentInstance(name: string): SerializableComponentInstance {
  const constructor = getSerializableComponentConstructor(name);
  return new constructor() as SerializableComponentInstance;
}

export function serializeValue(value: unknown): SerializedValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }

  if (isSerializableComponentInstance(value)) {
    return value.toJSON();
  }

  if (isRecord(value)) {
    return serializeRecordValue(value);
  }

  throw new Error(`Unsupported JSON serialization value: ${String(value)}`);
}

export function notifyTrackedFieldMutation(component: Component, fieldKey: string): void {
  if (!registeredEngine) {
    return;
  }

  fromEngine((engine) => {
    engine.serialization.recordFieldChange(
      component,
      fieldKey,
      serializeValue((component as unknown as Record<string, unknown>)[fieldKey]),
    );
  });
}

export function applySerializedChanges(
  component: SerializableComponentInstance,
  changes: Record<string, SerializedValue>,
): void {
  const apply = () => {
    const componentRecord = component as unknown as Record<string, unknown>;
    const fieldTypeByProperty = new Map(
      getSerializableFields(component.constructor as Function).map((field) => [field.property, field.type]),
    );

    for (const [fieldKey, value] of Object.entries(changes)) {
      const current = componentRecord[fieldKey];
      const fieldType = fieldTypeByProperty.get(fieldKey);

      if (fieldType === "bigint" && typeof value === "string") {
        componentRecord[fieldKey] = BigInt(value);
        continue;
      }

      componentRecord[fieldKey] = materializeSerializedValue(current, value);
    }

    component.__afterDeserialized();
  };

  if (!registeredEngine) {
    apply();
    return;
  }

  fromEngine((engine) => {
    engine.serialization.suspendTracking(apply);
  });
}