export function shallow<T>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  if (objA instanceof Map && objB instanceof Map) {
    if (objA.size !== objB.size) return false;
    for (const [key, value] of objA) {
      if (!objB.has(key) || !Object.is(value, objB.get(key))) return false;
    }
    return true;
  }

  if (objA instanceof Set && objB instanceof Set) {
    if (objA.size !== objB.size) return false;
    for (const value of objA) {
      if (!objB.has(value)) return false;
    }
    return true;
  }

  if (objA instanceof Date && objB instanceof Date) {
    if (objA.getTime() !== objB.getTime()) return false;
    return true;
  }

  const keysA = getOwnKeys(objA);
  if (keysA.length !== getOwnKeys(objB).length) {
    return false;
  }

  for (let index = 0; index < keysA.length; index += 1) {
    const key = keysA[index];

    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      return false;
    }

    if (!Object.is(objA[key as keyof T], objB[key as keyof T])) {
      return false;
    }
  }

  return true;
}

function getOwnKeys(obj: object): Array<string | symbol> {
  return (Object.keys(obj) as Array<string | symbol>).concat(
    Object.getOwnPropertySymbols(obj),
  );
}
