---
name: invariant
description: Use runtime `invariant(...)` assertions instead of type-only assertions (`!`, `as`) for nullable values, and pass nullable values directly when they are falsy.
---

# Invariant Usage Skill

Use this skill whenever you need to assert that a value exists at runtime and narrow types safely.

## Core Rules

1. Prefer runtime assertions over type-only assertions.
   - Use `invariant(value, "message")`.
   - Avoid non-null assertions (`value!`) and unnecessary casts (`as`) for existence checks.

2. For nullable/falsy values (`null` / `undefined`), pass the value directly to `invariant`.
   - ✅ `invariant(user, "user required")`
   - ✅ `invariant(node, "node not found")`
   - ❌ `invariant(user !== null, "user required")`
   - ❌ `invariant(node !== undefined, "node not found")`

3. Use explicit guard clauses for values where falsy values are valid.
   - Example: `0`, `""`, or `false` can be valid values.
   - In those cases, avoid `invariant(value, ...)` and use explicit checks.

## Patterns

### Replace type-level non-null assertion

```ts
// before
const root = document.getElementById("root")!;

// after
const root = document.getElementById("root");
invariant(root, "Element with id root not found");
```

### Replace boolean check in invariant when value is nullable

```ts
// before
invariant(config !== undefined, "config is required");

// after
invariant(config, "config is required");
```

### Guard when falsy values are valid

```ts
// value can be 0 and that is valid
const index = map.get(key);
if (index === undefined) {
  throw new Error("Index missing for key");
}
```

## Mindset

- `invariant` is for runtime safety and type narrowing.
- Prefer direct value assertions for nullable references.
- Use explicit guards instead of truthy checks when valid data can be falsy.
