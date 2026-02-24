# Engine UI Module (Planned)

This folder defines the modular UI boundary for engine-level authoring features.

## Why this exists

- Keep editor/UI logic isolated from ECS runtime internals
- Enable future UI rendering migrations (vanilla DOM -> React) with minimal churn
- Keep public API small and stable

## Initial scope

- Engine shell regions (left/center/right/bottom)
- World list panel
- Engine component catalog panel
- Entity creation in selected world
- Drag component onto entity

## Planned structure

```text
ui/
  index.ts
  core/
  layout/
  panels/
  adapters/
  contracts/
```

## Rules

1. `core` is framework-agnostic and owns state + commands
2. `adapters` translate UI framework/DOM events to `core` commands
3. `panels` are presentation only; no direct ECS mutation
4. All mutations flow through typed commands

## Related architecture docs

- [Engine Placement UI](../../../../docs/architecture/11-FEATURE-ENGINE-PLACEMENT-UI.md)
- [3-Phase Roadmap](../../../../docs/architecture/12-ROADMAP-ENGINE-GAME-PLACEMENT-AND-WORLD-IO.md)
