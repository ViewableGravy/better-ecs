# 13 - Editor Engine-First Migration Plan

## Purpose

Define the architecture and implementation steps to move editor behavior out of React and into engine-owned editor services, while keeping React as a thin visual adapter.

This document also defines how new editor functionality should be implemented going forward.

## Scope

This migration covers:

- Moving editor runtime logic (listeners, selection, gizmo interactions, pause lifecycle) into engine code.
- Keeping React responsible for rendering/editor UI composition only.
- Establishing a standard skill that must be followed for all future editor functionality work.

## Current Baseline (after latest refactor)

- `EngineClass` now passes itself to `EngineEditor`.
- `EngineEditor` owns pause lifecycle callbacks (`onPause`, `onUnpause`).
- `EngineCamera` owns `syncFromWorld()` and handles world-camera to editor-camera alignment:
  - prefers primary enabled world camera,
  - falls back to first enabled world camera,
  - otherwise defaults to `x=0, y=0, zoom=1`.

This establishes the correct ownership boundary:

- Engine: runtime/editor behavior.
- React: UI controls + visual presentation.

## Target Architecture

### 1) EngineEditor as orchestration root

`engine.editor` should become the single public runtime API for editor behavior.

Proposed surface:

- `engine.editor.running.pause()` / `resume()` / `toggle()`
- `engine.editor.camera.*`
- `engine.editor.gizmo.create(entityId)` / `destroy(entityId)` / `clear()`
- `engine.editor.selection.*`
- `engine.editor.input.listen()` / `unlisten()` (editor mode listeners)

### 2) Engine-owned managers

Create focused managers under editor/core boundaries:

- `EngineEditorCameraManager` (or keep in `EngineCamera` if still cohesive)
- `EngineEditorGizmoManager`
- `EngineEditorSelectionManager`
- `EngineEditorInputManager`

Guideline: managers should be stateful services with minimal public APIs and no React dependencies.

### 3) React adapters only

React components/hooks should:

- call engine editor APIs,
- subscribe to externalized state snapshots,
- avoid direct DOM event management for editor runtime behavior,
- avoid ECS mutation logic where an engine manager exists.

## Migration Plan

### Phase 1 - Extract gizmo lifecycle API

Goal: remove ad-hoc gizmo creation/removal from React actions.

Tasks:

1. Introduce `engine.editor.gizmo` manager with:
   - `create(entityId)`
   - `destroy(entityId)`
   - `clear()`
   - optional `currentEntityId()`
2. Move current "clear all gizmos" logic into manager.
3. Update `CenterCamera` action to call manager API instead of mutating ECS directly.
4. Keep rendering pass unchanged (still based on `Gizmo` component).

### Phase 2 - Move paused gizmo interaction to engine input manager

Goal: remove pointer interaction logic from `usePausedGizmoSelection`.

Tasks:

1. Move pointer hit-testing and drag state from React hook into `engine.editor.input` and/or `engine.editor.gizmo`.
2. Register listeners on pause (`onPause`) and unregister on unpause (`onUnpause`) or mode exit.
3. Keep React hook as temporary adapter (or remove if no longer needed).
4. Verify no behavior loss for:
   - axis drag,
   - rotate ring,
   - hover feedback,
   - alt+pick selection.

### Phase 3 - Consolidate editor pause-mode behavior

Goal: make pause transitions the explicit boundary between game behavior and editor behavior.

Tasks:

1. Keep game update paused via running state.
2. Attach editor-only listeners during pause (unless preview mode requires overrides).
3. Detach listeners on resume.
4. Ensure no duplicate listeners across repeated pause/resume cycles.

### Phase 4 - Introduce engine event adapters

Goal: support engine-aware event callbacks and ergonomic editor tools.

Tasks:

1. Add event wrappers for pointer/mouse interactions (engine-local abstraction over DOM events).
2. Provide derived helpers in event context:
   - `worldPoint()`
   - `entityAtPoint()`
3. Keep wrappers allocation-light in hot paths.
4. Avoid leaking raw browser event assumptions into higher-level managers.

### Phase 5 - Remove legacy React logic

Goal: React becomes presentational.

Tasks:

1. Delete now-redundant React-side editor hooks and listeners.
2. Replace with thin adapter hooks that call engine managers.
3. Keep only UI-level concerns (buttons, toolbars, panel state, visibility).

## Responsibilities and Boundaries

### Engine responsibilities

- ECS mutations tied to editor behavior.
- Pause/unpause editor runtime behavior.
- Input listener registration and cleanup for editor tools.
- Camera and gizmo state transitions.

### React responsibilities

- Rendering controls and status indicators.
- Dispatching user intents to engine APIs.
- Presenting state from engine (snapshots/selectors).

## Implementation Constraints

- Preserve strict type safety.
- Do not add compatibility shims or legacy paths.
- Prefer guard clauses.
- Keep public API minimal.
- In hot paths, avoid avoidable allocations.

## Verification Strategy

For each phase:

1. Targeted project verification (`engine`) after each completed unit of work.
2. Validate pause/resume transitions manually in the client app.
3. Confirm no duplicate listeners and no stale drag state after resume.
4. Confirm hierarchy/gizmo UI remains synchronized.

## Required Workflow Skill

All future editor functionality work must follow:

- `.github/skills/editor-engine-functionality/SKILL.md`

That skill is mandatory for new editor feature work and refactors.

## Definition of Done for each editor feature

A feature is complete only when:

1. Runtime logic lives in engine services/managers.
2. React only calls engine APIs and renders state.
3. Pause/unpause listener lifecycle is explicit and leak-free.
4. Type checks and project verification pass for changed files/projects.
5. Any replaced React logic is removed (no legacy duplicate path).
