# Refactor ContextEntryRegion component

## User Request

> 1. ContextEntryRegion
>    Currently this accepts some strange data, a Vec2 for halfExtents. I'm not sure what this is, but I think a reasonable primitive is a rectangle, where the top left is a vector and the width/height is a vector. This would reasonably have functionality built in for intercepting logic with another rectangle, and other basic checks. Assuming this is what it is used for, I would consider this a much more appropriate abstraction, because then we only need to consider rectangle and collisions on that rectangle.

## Current Implementation

The `ContextEntryRegion` component is currently defined in [apps/client/src/scenes/spatial-contexts-demo/components/context-entry-region.ts](apps/client/src/scenes/spatial-contexts-demo/components/context-entry-region.ts):

```typescript
import { Vec2 } from "@repo/engine";
import type { ContextId } from "@repo/plugins";

export class ContextEntryRegion {
  constructor(
    public targetContextId: ContextId,
    public halfExtents: Vec2,
  ) {}
}
```

It is used in [apps/client/src/scenes/spatial-contexts-demo/factories/spawnContextEntryRegion.ts](apps/client/src/scenes/spatial-contexts-demo/factories/spawnContextEntryRegion.ts) where it is added to an entity alongside a `Transform2D`. The `halfExtents` represent the distance from the center to the edges.

## Proposed Changes

1. **Introduce a `Rectangle` Class**: Create a `Rectangle` utility class (possibly in `@repo/engine/math`) that stores `position` (top-left) and `size` (width, height).
2. **Refactor Component**: Update `ContextEntryRegion` to use this `Rectangle` class or store `topLeft` and `size` directly.
3. **Add Intersection Logic**: Implement a `contains(point: Vec2)` or `intersects(other: Rectangle)` method on the `Rectangle` class to encapsulate collision logic.
4. **Update Factories**: Update `spawnContextEntryRegion` to accept rectangle parameters instead of half-extents.

## Benefits

- **Readability**: Top-left and Size are more intuitive than half-extents.
- **Encapsulation**: Moving intersection logic to a `Rectangle` class reduces boilerplate in systems.
- **Standardization**: Rectangles are a common primitive that can be reused for UI, cameras, and other regions.
