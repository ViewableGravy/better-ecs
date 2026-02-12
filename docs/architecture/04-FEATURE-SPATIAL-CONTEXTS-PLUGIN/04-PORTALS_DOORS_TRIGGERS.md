# Spatial Contexts — Portals, Doors, and Triggers

## Principle

Don’t model “enter house” as a heavy transition.

- A **door/threshold** usually just changes the focused world (and maybe camera/input routing).
- A **portal** is for special behavior: teleport, cutscene, scripted effects, etc.

## Two categories

### 1) Threshold / door (no teleport)

- Trigger happens in the current world (often the parent).
- Player focus changes to child world.
- Player position may remain identical (because coordinates overlap).

### 2) Portal (teleport)

- Trigger happens in a world.
- Focus changes to target world.
- Player position is explicitly set to a spawn point or computed transform.

## Component design (doc-level)

A single `Portal` component can support both:

- `mode: "focus" | "teleport"`
- `targetContextId`
- optional spawn info

## Systems

Portal handling should be implemented as a **dedicated system** (in the plugin), but games can override behavior by:

- not using the plugin portal system
- or subscribing to portal events and applying custom logic

## Acceptance criteria

- “Door into house” requires no asset reload and no forced unload of parent.
- Teleport portal supports large displacement.
- The API stays minimal; complex effects belong in game code.
