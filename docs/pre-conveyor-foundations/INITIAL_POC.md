# Initial POC — Grid + Hotbar + Placement (Client Demo)

## Goals
1. Toggle a bright pink infinite-style grid with a hotkey.
2. Select an item from a simple hotbar using keyboard input.
3. Place the selected item on grid cells; this creates ECS entities.
4. Delete placed entities with right click.
5. Show placement ghost preview before placement.
4. Keep architecture aligned with existing engine/update/render separation.

## Finalized decisions (from review)
- Renderer: stay with Canvas2D for this POC.
- Grid cell size: `1` world unit (may be revisited later).
- Grid origin: fixed at `(0, 0)`.
- Grid default visibility: ON.
- Grid toggle hotkey: modifier + `G` (`Cmd+G` on macOS, `Ctrl+G` elsewhere).
- Scope: demo scene only.
- Placement policy: blocked on collision with existing colliders/entities.
- Hotbar keys (initial): only key `1`.
- Item catalog (initial): only a `box` item.
- Selected item persistence: not required.
- Clear selection: yes (empty slot can clear selection).
- Placement input: left click.
- Deletion input: right click.
- Input handling while selected: gameplay input remains active (Factorio-like; no UI-focus gating for now).
- Placement mode: click-to-place (no paint/drag in first slice).
- Same-tick place/delete conflict policy: place wins.
- Placement anchor: top-left.
- Visuals: debug `Shape`.
- Rotation/direction: deferred.
- Placement range: unlimited.
- Ghost preview: required.
- Placeable debug box must include collider for movement/collision testing.
- Right-click delete target scope: any entity under cursor.
- Collider debug overlay hotkey: modifier + `H` (`Cmd+H` on macOS, `Ctrl+H` elsewhere).
- Collider debug default: OFF.

## Existing architecture alignment
- Rendering pipeline already supports ordered passes in the client render system.
- `Canvas2DRenderer` is already active and supports low-level drawing access via `renderer.low`.
- Update systems are already registered in app engine setup.
- Current world rendering pass (`RenderWorldPass`) can stay focused on entity drawables.

## Proposed first implementation slice

### Phase 1 — Grid foundation (first)
- Add grid configuration/state:
  - visibility: boolean (default true)
  - cell size: number (default 1 world unit)
  - color: bright pink
- Add a render pass that runs after frame clear and before world entities:
  - pass order target: `BeginFramePass` -> `GridPass` -> existing world/entity passes
- In `GridPass`, draw only visible lines that intersect the camera viewport.
- Toggle visibility with hotkey:
  - `Cmd+G` (macOS) / `Ctrl+G` (non-macOS)

### Phase 2 — Hotbar selection
- Add selected-item state/resource:
  - e.g. `selectedItem: "box" | null`
- Add input system to map key `1` to `box`.
- Keep UI minimal for now with a tiny on-screen indicator showing selected/none.

### Phase 3 — Placement
- Add placement system:
  - convert mouse screen coordinate to world coordinate
  - snap to integer grid cell
  - validate footprint (integer width/height, each >= 1)
  - validate occupancy (blocked when colliding)
  - create entity with required components
- First placement representation:
  - spawn with `Transform2D` + debug `Shape` + collider (for player collision test)
- Add ghost preview:
  - render reduced-alpha preview at snapped location
  - hide ghost when no item is selected
- Add deletion:
  - right click removes targeted entity under cursor

## Grid rendering approach decision

### Can this be done in Canvas2D without WebGL?
Yes.

A practical middle ground:
- Use a dedicated `GridPass` in Canvas2D.
- Compute camera-aligned world bounds for current viewport.
- Draw vertical/horizontal lines at integer multiples of cell size.
- Use modulo-style offset from camera position so lines appear infinite.
- Keep line width thin and color bright pink.

This gives the same functional result (infinite visual grid + camera coherence) for a POC, without introducing a new renderer yet.

### Renderer future track
- A renderer-track doc is included for future WebGL exploration.
- Current implementation remains Canvas2D-first.

## Minimal data model for POC
- `GridPosition { x: number; y: number }` (integers only)
- `GridFootprint { width: number; height: number }` (integers, >=1)
- `Placeable { itemType: "box" }` (temporary marker for demo)
- `BuildSelection { selectedItem: "box" | null }`
- `GhostPreview` (marker for reduced-alpha preview entity)

## Validation rules (POC)
- Reject non-integer `x`, `y`, `width`, `height`.
- Reject `width < 1` or `height < 1`.
- Default footprint for initial item: `1x1`.
- Occupancy behavior: block placement if target cells are occupied by colliding entities.

## Suggested system boundaries
- `GridHotkeySystem` (toggle visibility)
- `HotbarSelectionSystem` (key `1` -> `box`, clear support)
- `PlacementGhostSystem` (mouse -> snapped preview)
- `PlacementSystem` (left click -> spawn)
- `DeletionSystem` (right click -> remove placed entity)
- `GridPass` (render-only; no simulation decisions)
- `HotbarIndicatorPass` (tiny selected-item visual)

## Risks and mitigations
- Input conflicts with browser/system shortcuts (`Cmd+G` / `Ctrl+G`).
  - Mitigate by routing through engine input layer and fallback binding if needed.
- Grid line count spikes at extreme zoom-out.
  - Mitigate by capping max drawn lines per axis and/or adaptive step size.
- Placement determinism and conflicts.
  - Mitigate with explicit occupancy policy and deterministic tie-breaks.

## Incremental acceptance criteria
1. Press hotkey, grid visibility toggles on/off.
2. Press key `1`, selected item becomes `box`.
3. A tiny indicator shows selected item state (`box` or none).
4. Ghost preview appears at snapped cell under cursor.
5. Left click places `1x1` colliding debug box entity at snapped position.
6. Right click deletes targeted placed entity.
7. Invalid footprints are rejected.
8. Overlapping blocked cells are rejected.
9. Grid appears behind world entities but above clear color.

## Open decisions (to answer before coding)
- None for initial POC slice; remaining implementation questions should be tracked as code-level TODOs.
