# Renderer Track (Pre-Conveyor)

Purpose
- Record renderer-direction decisions while implementing grid/hotbar/placement.
- Keep current work on Canvas2D while preserving a migration path for shader-based rendering later.

Current decision
- Use Canvas2D for the initial proof of concept.

Why Canvas2D now
- Existing client pipeline already uses `Canvas2DRenderer`.
- Fastest route to validate gameplay interactions.
- Infinite-style grid can be approximated effectively with a camera-aware line pass.

Canvas2D grid implementation notes
- Add a `GridPass` between frame clear and world-entity render pass.
- Compute camera viewport bounds in world space.
- Draw major/minor lines at integer step (`cellSize = 1`) in bright pink.
- Clamp line count or increase draw step at extreme zoom-out.

When to consider WebGL/WebGPU
- Need shader-specific visuals (distance fade, anti-aliased procedural grid, major/minor line blending).
- Need higher rendering throughput under extreme zoom ranges.
- Need renderer architecture upgrades beyond this feature.

Follow-up doc links
- [Initial POC plan](../INITIAL_POC.md)
- [Grid](../grid/README.md)
