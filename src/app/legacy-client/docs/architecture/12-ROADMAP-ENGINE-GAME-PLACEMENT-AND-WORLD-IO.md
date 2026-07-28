# Roadmap: Engine Placement -> Game Placement -> World Serialization

## Overview

This roadmap sequences the three goals in dependency order so architecture remains clean while shipping useful vertical slices.

1. Engine placement foundation (editor UI + entity/component authoring)
2. Game placement workflow (runtime placement rules and UX)
3. Serialize/deserialize world (authoring persistence)

---

## Phase A — Engine Placement Foundation

Reference details: [11-FEATURE-ENGINE-PLACEMENT-UI.md](./11-FEATURE-ENGINE-PLACEMENT-UI.md)

### Deliverables

- Modular engine UI shell
- World list panel
- Engine component catalog panel
- Entity creation in selected world
- Drag component onto entity

### Exit criteria

- A developer can author an entity entirely from the editor shell
- Component attachment works through command pipeline only
- UI architecture supports adapter replacement (DOM -> React)

---

## Phase B — Game Placement Workflow

### Objective

Bridge editor-created entities/components with the existing in-game grid placement systems.

### Scope

- Placement intent model (what is being placed, where, and why)
- Validation adapters (`canPlaceAt` + collision/context constraints)
- Unified command path so editor and runtime placement share core logic
- Remove entity workflow compatible with placement model

### Recommended module boundaries

```text
packages/engine/src/ui/core/placement/
  placement-intent.ts
  placement-command.ts
  remove-command.ts
  placement-validators.ts

apps/client/src/systems/placement/
  runtime-placement-adapter.ts
  pointer-input.ts
```

### Exit criteria

- Editor placement and runtime placement both execute shared core placement rules
- Placement/remove can run against selected world explicitly
- No duplicate validation logic between editor and game

---

## Phase C — World Serialization / Deserialization

### Objective

Persist authored world state and load it back deterministically.

### Scope

- World snapshot format (versioned)
- Entity/component serialization for engine primitives first
- Deterministic component registry lookup on load
- Load-time validation and migration hooks

### Suggested file layout

```text
packages/engine/src/serialization/world/
  schema/
    world-snapshot.v1.ts
  encode/
    serialize-world.ts
    serialize-entity.ts
  decode/
    deserialize-world.ts
    deserialize-entity.ts
  registry/
    component-serializer-registry.ts
  migrations/
    v1-to-v2.ts (future)
```

### Exit criteria

- Save/load round-trip passes for worlds authored in Phase A/B
- Snapshot versioning is explicit
- Unknown components fail safely with actionable errors

---

## Cross-Phase Constraints

### Constraint 1: Modular ownership

- UI: `packages/engine/src/ui/*`
- ECS core: `packages/engine/src/ecs/*` and `core/*`
- Serialization: `packages/engine/src/serialization/*`
- App-specific experience: `apps/client/src/*`

### Constraint 2: Strictly typed contracts

- No `any`
- No non-null assertions
- Use runtime invariants for nullable values where needed

### Constraint 3: Minimal public surface

Expose stable entrypoints only; keep internal helpers private.

---

## Milestones

### M1 — Engine authoring shell complete

- All Step 1 stories accepted
- Basic docs/examples added for usage

### M2 — Unified placement domain complete

- Editor/game placement logic shares core command and validation modules
- Remove workflow integrated

### M3 — Persistent worlds complete

- Save/load world snapshots fully operational for engine primitives
- Round-trip tests and schema versioning in place

---

## Suggested execution order (small slices)

1. Shell layout + state contracts
2. Worlds panel + entity creation
3. Component catalog + drag/drop attach
4. Placement domain extraction (shared by editor + runtime)
5. Remove flow integration
6. World snapshot schema + serializer
7. World deserializer + load validation
8. Round-trip tests + docs hardening
