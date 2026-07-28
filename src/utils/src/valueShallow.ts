type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Seen = WeakMap<object, object>;

function isPrimitive(value: unknown): value is Primitive {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

export function valueShallow(a: unknown, b: unknown, seen: Seen = new WeakMap<object, object>()) {
  if (Object.is(a, b)) return true;
  if (isPrimitive(a) || isPrimitive(b)) return Object.is(a, b);

  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!valueShallow(a[i], b[i], seen)) return false;
    }
    return true;
  }

  const prev = seen.get(a as object);
  if (prev && prev === b) return true;
  seen.set(a as object, b as object);

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    const aVal = (a as Record<string, unknown>)[key];
    const bVal = (b as Record<string, unknown>)[key];
    if (!valueShallow(aVal, bVal, seen)) return false;
  }

  return true;
}
