# Spatial Contexts — Definitions, Factories, and External Sources

## Why this exists

We need to support both:

- static definitions (hard-coded)
- dynamic definitions (loaded from config/DB based on player position)
- programmatic add/remove
- “creator” functions for ergonomics and type safety

## Definitions vs runtime

### `ContextDefinition`

A definition is **pure configuration** + optional setup factory:

- `id`
- `parentId` (optional)
- policy (visibility/simulation)
- `setup(world)` (optional) — spawns entities, registers resources, etc.

### `ContextInstance`

A runtime instance tracks:

- loaded/unloaded state
- the actual engine `World`
- cached resources / subscriptions
- last-used time (for eviction)

## Creator function pattern

Prefer creator helpers that return a definition:

```ts
createHouseContext({
  id: "player_house",
  parentId: "overworld",
  policy: {
    visibility: "occludeParent",
    simulation: "pauseParent",
  },
  setup(world) {
    // spawn interior entities
  },
});
```

This can be a thin wrapper around `defineContext()` that enforces defaults.

## External sources (config/DB)

Introduce an abstraction:

- `ContextSource` (read-only): resolve definitions by id and/or by spatial query
- `MutableContextRegistry` (in-memory): manual register/unregister

Key capability for streaming:

- `resolveByPosition(position)` → returns candidate context ids (or definitions)

Notes:

- Keep this **optional** in v1. A static registry can satisfy most early demos.
- If the source is async, the runtime manager must support `ensureLoaded(id)` returning a promise.

## Acceptance criteria for v1 docs

- Definitions can be provided statically.
- The API does not block later introduction of async DB-backed resolution.
- Adding/removing definitions at runtime is a first-class concept.
