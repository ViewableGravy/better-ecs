// packages/engine/src/serialization/index.ts
import invariant from "tiny-invariant";

export type SerializableType =
  | "u8"
  | "u16"
  | "u32"
  | "int"
  | "f32"
  | "f64"
  | "float"
  | "string"
  | "boolean"
  | "bigint"
  | "json";

export interface SerializedObject {
  [key: string]: SerializedValue;
}

export type SerializedValue =
  | string
  | number
  | boolean
  | null
  | SerializedObject
  | SerializedValue[];

type SerializableField = {
  property: string;
  type: SerializableType;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function serializeValue(value: unknown): SerializedValue {
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

  if (value instanceof Serializable) {
    return value.toJSON();
  }

  if (isRecord(value)) {
    const result: SerializedObject = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = serializeValue(nestedValue);
    }

    return result;
  }

  throw new Error(`Unsupported JSON serialization value: ${String(value)}`);
}

export class Serializable {
  private static readonly serializableFields = new Map<Function, SerializableField[]>();

  public static registerField(target: Function, field: SerializableField): void {
    const fields = Serializable.serializableFields.get(target);

    if (!fields) {
      Serializable.serializableFields.set(target, [field]);
      return;
    }

    const existingField = fields.find((entry) => entry.property === field.property);
    if (existingField) {
      existingField.type = field.type;
      return;
    }

    fields.push(field);
  }

  private static getFields(target: Function): SerializableField[] {
    const constructors: Function[] = [];
    let currentTarget: Function | null = target;

    while (currentTarget && currentTarget !== Object) {
      constructors.unshift(currentTarget);
      currentTarget = Object.getPrototypeOf(currentTarget) as Function | null;
    }

    const mergedFields = new Map<string, SerializableField>();

    for (const constructor of constructors) {
      const fields = Serializable.serializableFields.get(constructor);
      if (!fields) {
        continue;
      }

      for (const field of fields) {
        mergedFields.set(field.property, field);
      }
    }

    return Array.from(mergedFields.values());
  }

  public to(type: "json" | "binary"): SerializedObject | ArrayBuffer {
    switch (type) {
      case "json":
        return this.toJSON();
      case "binary":
        return this.toBinary();
      default:
        throw new Error(`Unsupported serialization type: ${type}`);
    }
  }

  public toJSON(): SerializedObject {
    const fields = Serializable.getFields(this.constructor as Function);
    const result: SerializedObject = {};

    for (const field of fields) {
      result[field.property] = serializeValue((this as Record<string, unknown>)[field.property]);
    }

    return result;
  }

  private toBinary(): ArrayBuffer {
    const fields = Serializable.getFields(this.constructor as Function);

    let size = 0;
    for (const { property, type } of fields) {
      const value = (this as Record<string, unknown>)[property];

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
      const value = (this as Record<string, unknown>)[property];

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
}

export function serializable(type: SerializableType = "json") {
  return function decorator(target: { constructor: Function }, propertyKey: string | symbol) {
    invariant(typeof propertyKey === "string", "Serializable fields must use string property names");

    Serializable.registerField(target.constructor, { property: propertyKey, type });
  };
}
