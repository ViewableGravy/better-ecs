# Spatial Contexts — Context Manager Runtime + World Stack

## Responsibilities

The context manager is plugin runtime state stored on the active scene (via `useScene()` access).

It must:

- track definitions
- create/load/unload worlds
- track focused world
- compute world stack
- expose policy decisions (visibility/simulation)

## Suggested API shape (conceptual)

- `getFocusedContextId()`
- `setFocusedContextId(id)` (no implicit load/unload)
- `getWorld(id)` / `getWorldOrThrow(id)` (loaded only)
- `ensureWorldLoaded(id)` (may be async when backed by DB/config)
- `unloadWorld(id)` (cannot unload focused)

### Stack and policies

- `getContextStack()` → `[focused, parent, parentOfParent, ...]`
- `getVisibleWorlds()` → ordered list to render (may be a subset of stack)
- `getSimulatedWorlds()` → list of worlds that run update

Policy is intentionally separate so that:

- rendering can ignore simulation policies
- simulation can ignore rendering policies

## House vs dungeon examples

House (occluding):

- focused: `house`
- visible: `[house]` (optionally include parent as dim backdrop)
- simulated: `[house]` or `[house, overworld]` (game choice)

Dungeon (isolating):

- focused: `dungeon`
- visible: `[dungeon]`
- simulated: `[dungeon]`
- parent may be unloaded or suspended (policy-driven)

## Key invariants

- focused context must always be loaded
- `parentId` chain must not cycle
- default/root world always exists

## Testing notes

Most of this can be unit-tested without rendering:

- stack computation
- policy application
- load/unload invariants
