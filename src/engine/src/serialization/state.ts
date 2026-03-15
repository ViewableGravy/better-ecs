import type { Component } from "@engine/ecs/component";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

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

export type SerializableField = {
  property: string;
  type: SerializableType;
};

export type SerializableComponentConstructor = new (...args: any[]) => Component;

const serializableFields = new Map<Function, SerializableField[]>();
const serializableComponentConstructors = new Map<string, SerializableComponentConstructor>();

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function registerSerializableField(target: Function, field: SerializableField): void {
  const fields = serializableFields.get(target);

  if (!fields) {
    serializableFields.set(target, [field]);
    return;
  }

  const existingField = fields.find((entry) => entry.property === field.property);
  if (existingField) {
    existingField.type = field.type;
    return;
  }

  fields.push(field);
}

export function getSerializableFields(target: Function): SerializableField[] {
  const constructors: Function[] = [];
  let currentTarget: Function | null = target;

  while (currentTarget && currentTarget !== Object) {
    constructors.unshift(currentTarget);
    currentTarget = Object.getPrototypeOf(currentTarget) as Function | null;
  }

  const mergedFields = new Map<string, SerializableField>();

  for (const constructor of constructors) {
    const fields = serializableFields.get(constructor);
    if (!fields) {
      continue;
    }

    for (const field of fields) {
      mergedFields.set(field.property, field);
    }
  }

  return Array.from(mergedFields.values());
}

export function hasSerializableField(target: Function, property: string): boolean {
  return getSerializableFields(target).some((field) => field.property === property);
}

export function registerSerializableComponentConstructor(constructor: SerializableComponentConstructor): void {
  serializableComponentConstructors.set(constructor.name, constructor);
}

export function getSerializableComponentConstructor(name: string): SerializableComponentConstructor {
  const constructor = serializableComponentConstructors.get(name);
  if (!constructor) {
    throw new Error(`Serializable component constructor "${name}" is not registered`);
  }

  return constructor;
}

export function materializeSerializedValue(current: unknown, value: SerializedValue): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const currentItems = Array.isArray(current) ? current : [];
    return value.map((item, index) => materializeSerializedValue(currentItems[index], item));
  }

  const target = isRecord(current) && !Array.isArray(current) ? current : {};

  for (const [key, nestedValue] of Object.entries(value)) {
    target[key] = materializeSerializedValue(target[key], nestedValue);
  }

  return target;
}