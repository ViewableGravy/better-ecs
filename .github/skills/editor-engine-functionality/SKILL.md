---
name: editor-engine-functionality
description: Required workflow for adding or refactoring editor functionality so runtime/editor behavior lives in engine services and React stays a visual adapter.
---

# Editor Engine Functionality

## Purpose

Enforce an engine-first implementation model for editor features.

Use this skill to ensure editor behavior is implemented in `engine.editor` services/managers, with React limited to UI rendering and intent dispatch.

## When to use

- Adding any new editor behavior (gizmo, selection, placement, transforms, tool modes).
- Refactoring existing editor logic currently implemented in React hooks/components.
- Changing pause/unpause behavior, editor input listeners, or editor camera behavior.

## Required implementation flow

1. Define the feature API on `engine.editor` first.
2. Implement behavior in engine-owned services/managers (no React dependency).
3. Wire pause/resume lifecycle in `EngineEditor` (`onPause` / `onUnpause`) where relevant.
4. Add/adjust React adapters to call engine APIs and render engine state only.
5. Remove replaced React runtime logic immediately (no legacy duplicate path).

## Architecture rules

- Engine owns editor runtime logic:
  - ECS mutations,
  - input listeners,
  - camera/gizmo/selection state,
  - pause-mode tool behavior.
- React owns presentation:
  - layout, buttons, indicators, inspector panels,
  - event intent dispatch to engine APIs.
- Keep manager APIs small (`create`, `destroy`, `clear`, etc.).
- Prefer guard clauses and strict typing.
- Avoid avoidable allocations in pointer/update hot paths.

## Checklist (must pass)

- [ ] Feature behavior is implemented in engine code, not React hooks.
- [ ] `engine.editor` exposes a minimal public API for the feature.
- [ ] Pause/resume listener lifecycle is explicit and leak-free.
- [ ] Replaced React runtime logic is removed.
- [ ] Targeted verification is run for affected projects/files.

## Notes

- If a React hook still exists after migration, it should be a thin adapter only.
- If ownership is unclear, default to engine ownership unless it is purely visual UI state.
