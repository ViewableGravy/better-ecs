import type { SerializedObject, SerializedValue } from "@engine/serialization";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function cloneSerializedObject(value: SerializedObject): SerializedObject {
  const result: SerializedObject = {};

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = cloneSerializedValue(value[key]);
    }
  }

  return result;
}

export function cloneSerializedValue(value: SerializedValue): SerializedValue {
  if (Array.isArray(value)) {
    const result = new Array<SerializedValue>(value.length);

    for (let index = 0; index < value.length; index += 1) {
      result[index] = cloneSerializedValue(value[index]);
    }

    return result;
  }

  if (isSerializedObject(value)) {
    return cloneSerializedObject(value);
  }

  return value;
}

export function serializedValuesEqual(left: SerializedValue, right: SerializedValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (!serializedValuesEqual(left[index], right[index])) {
        return false;
      }
    }

    return true;
  }

  if (isSerializedObject(left) || isSerializedObject(right)) {
    if (!isSerializedObject(left) || !isSerializedObject(right)) {
      return false;
    }

    for (const key in left) {
      if (!Object.prototype.hasOwnProperty.call(left, key)) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(right, key)) {
        return false;
      }

      if (!serializedValuesEqual(left[key], right[key])) {
        return false;
      }
    }

    for (const key in right) {
      if (Object.prototype.hasOwnProperty.call(right, key) && !Object.prototype.hasOwnProperty.call(left, key)) {
        return false;
      }
    }

    return true;
  }

  return left === right;
}

function isSerializedObject(value: SerializedValue): value is SerializedObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}