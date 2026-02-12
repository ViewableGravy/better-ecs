# Spatial Contexts Plugin — Step-by-step Implementation

This folder breaks the spatial contexts plugin work into **small, actionable steps**.

## Core constraints (source of truth)

- Exactly **one scene** is active at a time.
- A scene may own **many worlds** (aka contexts).
- A “world” is an ergonomic abstraction similar to a PixiJS container/layer:
  - Worlds can be **nested** (parent/child).
  - Multiple worlds may occupy the **same coordinates** in the parent (e.g. house interior vs overworld).
  - Visibility/simulation is controlled by policy (not by physically separating coordinates).
- “Transition” should not imply loading/unloading.
  - Switching the player from one world to another is primarily a **focus/visibility change**.
  - **Portals** exist for cases that truly need teleportation (large spatial displacement) or special rules.
- The render pipeline already exists (render queue + pipeline stages). Spatial contexts should **integrate** with it, not replace it.

## Terminology

- **Context**: a “world instance” managed by the plugin (1:1 with an engine `World`).
- **Focused world**: the world the local player currently inhabits (input + primary simulation).
- **World stack**: the chain of focused world → parent → … used to decide what’s visible and/or still simulated.
- **Policy**: rules that decide visibility and simulation of parent/child worlds.

## Documents

1. [01-Mental model](./01-MENTAL_MODEL.md)
2. [02-Definitions, factories, and external sources](./02-DEFINITIONS_AND_SOURCES.md)
3. [03-Context manager runtime + world stack](./03-CONTEXT_MANAGER_RUNTIME.md)
4. [04-Portals, doors, and triggers](./04-PORTALS_DOORS_TRIGGERS.md)
5. [05-Rendering integration (existing pipeline)](./05-RENDERING_INTEGRATION.md)
6. [06-Task breakdown (very small tasks)](./06-TASK_BREAKDOWN.md)

## Implementation order (recommended)

Follow the order above; it intentionally makes rendering/portals depend on a stable runtime model.
