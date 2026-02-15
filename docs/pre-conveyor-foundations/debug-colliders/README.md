# Debug Collider Rendering

Purpose
- Make collider bounds visible during development for tuning and validation.
- Improve iteration speed for movement/collision-heavy features (including placement).

Current pain point
- Colliders are not currently visible, which makes fit/tuning difficult.

POC objective
- Add a toggleable collider-debug overlay in the demo scene.
- Ensure placed debug box colliders are clearly visible.

Suggested behavior
- Default state: OFF.
- Toggle hotkey: modifier + `H` (`Cmd` on macOS, `Ctrl` elsewhere).
- Draw style:
  - Colliders: high-contrast outline (e.g., cyan/green)
  - Optional blocked placement cell: red overlay
- Render order:
  - Above normal world entities
  - Above grid

System boundaries
- `ColliderDebugPass` or `ColliderDebugRenderSystem` (render-only)
- Reads collider-related components and `Transform2D`
- No simulation logic changes

Future expansion
- Different colors for trigger vs solid colliders
- Per-layer visibility toggles
- Labeling (entity id, collider extents)

Related docs
- [Placement](../placement/README.md)
- [Initial POC plan](../INITIAL_POC.md)
