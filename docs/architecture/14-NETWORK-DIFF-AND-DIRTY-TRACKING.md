# 14 - Network Diff And Dirty Tracking

## Purpose

Define the engine-native architecture for networking-oriented change tracking so serialization can scale beyond full-scene snapshots.

This document is the source of truth for the initial refactor that introduces:

- component base types,
- serializable component metadata,
- dirty tracking,
- dirty queues,
- ordered diff commands,
- global engine registration.

## Scope

This refactor covers:

- Migrating all engine components to a shared `Component` base in one pass.
- Introducing `@SerializableComponent` alongside the existing field-level `@serializable(...)` decorator.
- Making dirty tracking and versioning engine-native.
- Tracking structural world mutations and field mutations.
- Exposing a public diff command API with replay support.
- Supporting both JSON and binary diff serialization in this pass.
- Registering the created engine globally and treating multiple engine instances in one process as invalid.

This refactor does not attempt to:

- optimize the dirty queue storage to world-like dense storage yet,
- use proxies for change tracking,
- preserve backward compatibility with pre-refactor plain-class components.

## Requirements Locked In

### Migration policy

- All engine components move to a shared `Component` base now.
- There is no temporary compatibility layer for old component shapes.
- The intended authoring shape is:
  - `class MyComponent extends Component`
  - `@SerializableComponent`
  - `@serializable(...)` for individual fields.

### Dirty tracking policy

- Dirty tracking exists to reduce network traffic first.
- Versioning uses one global monotonic engine counter.
- Structural changes are tracked in the same diff system as property writes.
- Direct property assignment must remain valid userland API.
- Tracking must use setters/getters and explicit wrapped state, not proxies.

### Queue policy

- Dirty queue creation is gated behind `createEngine({ config: { serialization: { enableDirtyQueue } } })`.
- Queue entries must carry enough information to avoid re-querying world state later.
- Consumers need both modes:
  - drain and clear,
  - read without clearing.
- Current implementation may use a simple queue abstraction backed by arrays.
- Future optimization to world-like storage is expected but not required in this pass.

### Diff policy

- First pass may serialize dirty components rather than field-level wire diffs.
- The public diff command surface still needs field-aware change information so future optimization does not require another architectural rewrite.
- Required mutation families for this pass:
  - `create-entity`
  - `destroy-entity`
  - `add-component`
  - `remove-component`
  - `set-field`

### Global engine policy

- `createEngine(...)` registers the created engine globally.
- Creating a second engine in the same process throws.
- `fromContext(...)` remains the main read API, but engine-backed lookups should resolve through the registered global engine rather than depending on per-cycle engine context assignment.
- Render-specific context remains execution-bound where necessary.

## Target Architecture

### 1) Base component model

Introduce a new engine base hierarchy:

- `Component`
  - engine-owned runtime identity and attachment metadata,
  - attached `entityId`,
  - attached `worldId`,
  - component version state,
  - dirty bookkeeping hooks.
- `SerializableComponent` behavior
  - marks a component class as participating in serialization and diff tracking,
  - reuses field metadata registered by `@serializable(...)`.

Authoring target:

```ts
@SerializableComponent
export class MyComponent extends Component {
  @serializable("float")
  public value = 0;
}
```

### 2) Field instrumentation

The field decorator layer becomes responsible for installing accessors that:

1. update the stored value,
2. request the next global version,
3. register field change metadata,
4. enqueue a diff command if the component was not already queued for that version window.

Conceptually:

```ts
set(newValue) {
  internalValue = newValue;
  component.markFieldChanged(fieldKey, newValue);
}
```

### 3) Nested mutation tracking

Nested serializable state must be tracked for existing engine patterns such as:

- `Transform2D.curr.pos.x`
- `Transform2D.curr.scale.y`
- `Sprite.tint.r`

Requirements:

- Support nested plain objects.
- Support nested class instances used by serializable fields.
- Support arrays.
- Track array index writes and mutating methods in this pass.
- Do not use proxies.

Implication:

- serializable nested objects need engine-installed accessor wrapping or companion tracked wrappers,
- nested state mutation must flow back to the owning component so the component version stays coherent.

### 4) Component attachment metadata

When a component is added to a world/entity, the engine attaches runtime metadata to the component:

- `entityId`
- `worldId`

This enables:

- queue entries to be produced at mutation time,
- structural removals to emit correct diff commands,
- future pooled command creation without world lookups.

### 5) Dirty queue and command model

The queue should store commands, not just component references.

Minimum command shape direction:

```ts
type DiffCommand =
  | { op: "create-entity"; version: number; worldId: string; entityId: EntityId }
  | { op: "destroy-entity"; version: number; worldId: string; entityId: EntityId }
  | { op: "add-component"; version: number; worldId: string; entityId: EntityId; componentType: string; data: unknown }
  | { op: "remove-component"; version: number; worldId: string; entityId: EntityId; componentType: string }
  | { op: "set-field"; version: number; worldId: string; entityId: EntityId; componentType: string; changes: Record<string, unknown> };
```

Notes:

- `changes` should be shaped so field-level diffs can be emitted later even if v1 transport chooses component-level payloads.
- Multiple commands for the same component must preserve order through monotonic versions.

### 6) World mutation integration

World operations must participate in diff tracking:

- entity create,
- entity destroy,
- component add,
- component remove,
- component attach/detach bookkeeping.

Newly attached components should be treated as dirty immediately so initial sync includes them.

### 7) Public API direction

Public engine-facing additions should include:

- dirty queue accessors,
- diff command serialization to JSON,
- diff command serialization to binary,
- diff replay/apply helpers,
- engine config for enabling dirty queue creation.

Example config direction:

```ts
createEngine({
  config: {
    serialization: {
      enableDirtyQueue: true,
    },
  },
});
```

## Implementation Notes

### Queue storage

Initial implementation can use a literal queue abstraction over arrays.

Documented future direction:

- replace with world-like dense storage,
- reduce allocations via pooling,
- enable renderer-side dirty iteration from the same mechanism.

### Ordering and tearing

One global monotonic version source avoids ambiguity when multiple components mutate in the same frame or callback chain.

Component-level versioning is the minimum requirement for avoiding state tearing. Field-level dirty metadata should be preserved in command payloads to keep future network optimization straightforward.

### Context transition

The previous execution-scoped engine context model is no longer sufficient for out-of-band callbacks that mutate tracked state.

The new model should separate:

- globally registered engine access,
- transient render-context access,
- scene/world selection derived from the active engine state.

## Verification Requirements

This refactor is not complete until it has:

1. Engine-level tests for tracked field writes.
2. Engine-level tests for structural commands.
3. Replay tests proving ordered diff application.
4. JSON diff serialization coverage.
5. Binary diff serialization coverage.
6. Verification that direct assignment still marks tracked changes.
7. Verification that nested writes on existing class-based state mark tracked changes.

## Current Status

Implementation status is tracked in:

- `docs/NETWORK_DIRTY_TRACKING_IMPLEMENTATION_STATUS.md`
