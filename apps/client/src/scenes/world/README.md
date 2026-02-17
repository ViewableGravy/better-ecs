# Spatial Contexts Demo (Userland)

## Goal

Demonstrate that spatial context switching and multi-world rendering can be implemented fully in scene userland while keeping the plugin generic.

This scene validates:

1. **Userland context switching without portals** (enter/exit house by position).
2. **Simultaneous rendering of multiple worlds** (overworld + house context stack).
3. **Portal-based transitions still work** (overworld/house -> dungeon, dungeon -> overworld).
4. **Simple temporary gameplay constraints** (circle colliders for player, trees, furniture).

---

## What this scene does

### Contexts

- `default` (overworld)
- `house_1` (house interior layered as a child of overworld)
- `dungeon_1` (separate focused-only context)

Defined in:

- `constants.ts`
- `index.ts` via `defineContext(...)`

### Context scene wrapper

The scene uses `createContextScene(...)` from `@repo/spatial-contexts`.

This ensures context manager setup happens automatically at scene creation time and avoids manual global runtime registration from app bootstrap.

### Userland systems

- `HouseContextSystem`:
  - Switches focus `default <-> house_1` based on player position inside house bounds.
  - Copies player position into target world before focus switch.

- `HouseVisualsSystem`:
  - Controls alpha based on focus state:
    - Outside world dimmed to 50% while inside house.
    - House roof hidden while inside.
    - House interior shown only while inside.

- `SceneCollisionSystem`:
  - Simple circle-vs-circle pushout collision against nearby colliders.

- `DebugOverlaySystem`:
  - Renders runtime state in top-right overlay:
    - focused context
    - context stack
    - visible contexts
    - player position
    - outside/roof/interior alpha values

### Spawn/factory organization

Scene setup is split into factory files to keep `index.ts` declarative:

- background / house / dungeon / door
- tree / table / chair

This keeps scene composition readable and avoids large inline setup blocks.

---

## Expected behavior

### Entering the house (without portal)

When player moves into house bounds:

- focused context changes to `house_1`
- visible contexts become `default -> house_1`
- outside alpha becomes `0.50`
- roof alpha becomes `0.00`
- interior alpha becomes `1.00`

### Exiting the house

When player leaves house bounds:

- focused context returns to `default`
- outside alpha becomes `1.00`
- roof alpha becomes `1.00`
- interior alpha becomes `0.00`

### Portals

- Overworld door teleports to dungeon.
- House interior door teleports to dungeon.
- Dungeon door teleports back to overworld.

---

## Run instructions

From workspace root:

1. Install dependencies: `bun install`
2. Start app/dev server: `bun dev`
3. Open client at `http://localhost:3000`

---

## Verification guidance (Playwright)

This demo was validated through browser automation checks that inspect the debug overlay text while moving the player with keyboard input.

### What to verify in automation

1. Initial state:
   - `focused: default`
   - `outsideAlpha: 1.00`
   - `roofAlpha: 1.00`
   - `interiorAlpha: 0.00`

2. Move right into house bounds:
   - `focused: house_1`
   - `visible: default -> house_1`
   - `outsideAlpha: 0.50`
   - `roofAlpha: 0.00`
   - `interiorAlpha: 1.00`

3. Move left back out:
   - `focused: default`
   - alpha values return to outside visible / roof visible / interior hidden.

4. Trigger portals:
   - Reach dungeon from house or overworld door.
   - Return to overworld via dungeon door.

---

## Relevant implementation notes from development

- Portal activation previously failed due an invalid world-wrapper identity guard. Portal logic should not rely on wrapper instance equality between manager world wrappers and active world wrappers.
- Portal placements were tuned to ensure reachable traversal with collision + context switching behavior.
- Browser-launch automation can fail in some host environments; headless automation is a valid fallback for deterministic checks.

---

## Scope boundary

This folder intentionally contains scene-specific gameplay/visual logic. The plugin core remains generic and free of game-specific concepts.
