# Spatial Contexts — Mental Model

## What problem are we solving?

We want ergonomic “worlds within worlds”:

- A **house interior** can exist _inside_ the overworld without moving coordinates.
- Entering a house should not require unloading the overworld.
- A **dungeon** can behave like a separate layer/world that hides or suspends the overworld.
- A **portal** can teleport the player far away (true spatial displacement) without conflating that with simple “entering a child world”.

## Core model

- A spatial context is **just an engine `World`**.
- The spatial-contexts plugin is responsible for:
  - creating/disposing worlds
  - deciding which worlds are visible
  - deciding which worlds are simulated
  - exposing ergonomics for “focused world”

## Focused world and world stack

At any moment, the local player is in exactly one **focused world**.

From that focused world, we can compute a **world stack** via parent pointers:

```
focused (e.g. house_interior)
  -> parent (overworld)
    -> parent (root)
```

The stack is used for _policy decisions_:

- **Visibility policy** (render): which worlds are drawn, and how they are composited.
- **Simulation policy** (update): which worlds continue simulating even when not focused.

## World policies (examples)

These policies are per-world (or per relationship).

### House / interior (overlapping coordinates)

Goal: When the player is inside the house:

- The interior is visible.
- The overworld is typically not visible (or optionally shown as dimmed backdrop).
- The overworld may continue simulating or may be paused (game-specific).

### Dungeon (separate layer)

Goal: When inside the dungeon:

- Only the dungeon is visible.
- The overworld is hidden and often suspended or unloaded.

### Portal (teleport)

Goal:

- The player moves to a different focused world, and optionally to a different coordinate system/spawn.
- This is not the default mechanism for entering child worlds.

## Non-goals (v1)

- Cross-world physics collisions.
- Automatically determining world membership from transforms without explicit triggers.
- A full streaming solution (we’ll leave hooks for it, but keep v1 deterministic and testable).
