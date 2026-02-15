# Initial POC — Grid + Hotbar + Placement (Client Demo)

## Goals
1. Toggle a bright pink infinite-style grid with a hotkey.
2. Select an item from a simple hotbar using keyboard input.
3. Place the selected item on grid cells; this creates ECS entities.
4. Keep architecture aligned with existing engine/update/render separation.

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
  - requested: Cmd+G (question below for non-mac fallback)

### Phase 2 — Hotbar selection
- Add selected-item state/resource:
  - e.g. `selectedItem: "conveyor" | "chest" | null`
- Add input system to map number keys to hard-coded item IDs.
- Keep UI minimal for now (console/debug overlay optional).

### Phase 3 — Placement
- Add placement system:
  - convert mouse screen coordinate to world coordinate
  - snap to integer grid cell
  - validate footprint (integer width/height, each >= 1)
  - create entity with required components
- First placement representation:
  - spawn with `Transform2D` + debug `Shape` (until final sprites are ready)

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

### When to introduce WebGL renderer
Consider a separate renderer track only if needed later for:
- very high zoom ranges with heavy overdraw,
- advanced shader effects (distance fade, anti-aliased procedural grid, multi-resolution major/minor lines),
- or broader renderer roadmap decisions beyond this feature.

## Minimal data model for POC
- `GridPosition { x: number; y: number }` (integers only)
- `GridFootprint { width: number; height: number }` (integers, >=1)
- `Placeable { itemType: string }` (temporary marker for demo)
- `BuildSelection { selectedItem: string | null }`

## Validation rules (POC)
- Reject non-integer `x`, `y`, `width`, `height`.
- Reject `width < 1` or `height < 1`.
- Default footprint for most items: `1x1`.
- Occupancy conflict behavior (block/replace) to be decided.

## Suggested system boundaries
- `GridHotkeySystem` (toggle visibility)
- `HotbarSelectionSystem` (number keys -> selected item)
- `PlacementSystem` (mouse -> spawn)
- `GridPass` (render-only; no simulation decisions)

## Risks and mitigations
- Input conflicts with browser/system shortcuts (`Cmd+G`).
  - Mitigate with alternate fallback mapping.
- Grid line count spikes at extreme zoom-out.
  - Mitigate by capping max drawn lines per axis and/or adaptive step size.
- Placement determinism and conflicts.
  - Mitigate with explicit occupancy policy and deterministic tie-breaks.

## Incremental acceptance criteria
1. Press hotkey, grid visibility toggles on/off.
2. Press hotbar key, selected item changes.
3. Click world, entity appears snapped to integer grid.
4. Invalid footprints are rejected.
5. Grid appears behind world entities but above clear color.

## Open decisions (to answer before coding)
See the question checklist in the implementation discussion message.
