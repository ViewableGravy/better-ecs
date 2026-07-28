# Feature: Engine Placement UI (Modular Foundation)

## Context

The project has two parallel goals:

1. Build a reusable engine
2. Build a game on top of that engine

This document defines the **engine-level placement foundation** (editor shell + entity/component authoring) before expanding gameplay placement workflows.

---

## Goals (Step 1: Engine Placement)

### Required in this phase

1. Engine UI shell (left sidebar, center canvas, right sidebar, bottom bar)
2. Worlds panel (list/select worlds)
3. Components panel (engine components only for now)
4. Entity creation in sidebar (inside selected world)
5. Drag component from component list onto entity

### Explicit non-goals in this phase

- No gameplay item placement UX yet (that is Step 2)
- No custom user component authoring UI yet
- No React migration yet (only architecture should support it later)
- No save/load pipeline yet (that is Step 3)

---

## Modularity Rules

To keep migration and maintenance easy, all editor UI concerns must be isolated from ECS runtime internals.

### Boundary 1: Headless editor domain

`packages/engine/src/ui/core/*`

- Pure state, commands, and workflows
- No DOM references
- No rendering framework references

### Boundary 2: View adapter layer

`packages/engine/src/ui/adapters/*`

- Binds headless domain to concrete rendering UI (vanilla DOM now, React later)
- Translating events -> commands and state -> presentational models

### Boundary 3: Presentation modules

`packages/engine/src/ui/panels/*` and `packages/engine/src/ui/layout/*`

- Shell layout and panel composition
- No ECS mutation logic directly in panel code
- Mutations route through command handlers in `core`

### Architectural outcome

If React is adopted later, we swap adapter/presentation modules while retaining `core` workflows and tests.

---

## Proposed Folder Structure

> Physical source path follows workspace convention (`src`). Public import surface can still be exposed as `@repo/engine/ui`.

```text
packages/engine/src/ui/
  index.ts
  README.md

  core/
    state/
      editor-state.ts
      selection-state.ts
    commands/
      create-entity.ts
      attach-component.ts
      remove-component.ts
    services/
      world-service.ts
      entity-service.ts
      component-catalog-service.ts
    dnd/
      drag-payload.ts
      drop-targets.ts

  layout/
    engine-shell.ts
    regions.ts

  panels/
    worlds/
      worlds-panel.ts
    components/
      components-panel.ts
    entities/
      entities-panel.ts
    inspector/
      inspector-panel.ts

  adapters/
    dom/
      mount-engine-ui.ts
      event-bindings.ts
    react/
      README.md (future)

  contracts/
    ui-events.ts
    ui-models.ts
```

---

## Step 1 Stories (Engine Placement)

### Story 1: Engine shell layout

- Define shell region contracts (left, center, right, bottom)
- Mount center canvas independently from panel rendering
- Validate panel resize behavior and deterministic layout state

**Acceptance criteria**
- [ ] Shell renders with 4 regions
- [ ] Canvas lifecycle is independent of panel rerenders
- [ ] Layout state can be serialized (panel widths, collapsed flags)

---

### Story 2: Worlds panel

- Read world list from world registry abstraction
- Support world selection and active-world highlight
- Emit `selectWorld` command from panel interactions

**Acceptance criteria**
- [ ] World list is derived from a single source of truth
- [ ] Active world is visually distinct
- [ ] Selection command updates core editor state

---

### Story 3: Engine components panel

- Define engine component catalog (Transform, Sprite, etc.)
- Render catalog list with search/filter hooks
- Add drag payload generation for catalog items

**Acceptance criteria**
- [ ] Panel renders engine component catalog only
- [ ] Components are draggable
- [ ] Drag payload type is validated in `core/dnd`

---

### Story 4: Entity creation in selected world

- Add `createEntity(worldId)` command
- Add sidebar action to create entity in active world
- Reflect entity immediately in entities panel

**Acceptance criteria**
- [ ] Created entity is attached to selected world
- [ ] Entity list updates immediately
- [ ] Command is testable without DOM

---

### Story 5: Drag component onto entity

- Define drop targets for entity rows/cards
- Translate drop -> `attachComponent(entityId, componentType)` command
- Handle duplicate/invalid attach attempts with guard clauses

**Acceptance criteria**
- [ ] Dropping a component on entity attaches component data
- [ ] Duplicate attach is prevented or handled predictably
- [ ] Failures surface through UI-safe error events

---

## Engine API Surface (Minimal)

Keep public API narrow:

- `createEditorUiDomain(...)`
- `createEngineUiLayout(...)`
- `mountEngineUiDom(...)`

Avoid exposing internal panel implementation details from public entrypoints.

---

## Testing Strategy for Step 1

### Unit tests (engine package)

- `core/commands/*` behavior
- world selection transitions
- component attach constraints
- drag payload validation

### Integration tests (client/app)

- shell mounting
- create entity from sidebar
- drag component -> entity row

### Regression focus

- no direct ECS mutation in view files
- command-only mutation flow
- stable contracts for future adapter swap (React)
