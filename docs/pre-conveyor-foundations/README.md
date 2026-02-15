# Pre-Conveyor Foundations

This folder captures the prerequisites needed before implementing conveyors in the client demo.

Scope:
- Grid foundation (simulation + rendering + snapping)
- Hotbar selection (input-driven item selection)
- Placement flow (spawn entities onto snapped grid coordinates)
- Renderer track notes (Canvas2D now, WebGL later if needed)
- Debug collider visualization

Subfolders:
- [grid](./grid/README.md)
- [hotbar](./hotbar/README.md)
- [placement](./placement/README.md)
- [renderer](./renderer/README.md)
- [debug-colliders](./debug-colliders/README.md)

Primary planning doc:
- [Initial POC plan](./INITIAL_POC.md)

Status:
- Canvas2D is the selected renderer path for the current POC.
- Scope is demo-scene specific.
