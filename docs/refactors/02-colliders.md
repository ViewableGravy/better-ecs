# Collider Abstractions

## User Request

> 2. CircleCollider
>    We have a circle collider, but I feel like it would also make sense to create a rectangle collider which abstracts the Rectangle class. Since we would already have collision logic on the rectangle, this should be trivial, but will support collisions through the collision system

## Current Implementation

We currently only have a `CircleCollider` in [apps/client/src/scenes/spatial-contexts-demo/components/circle-collider.ts](apps/client/src/scenes/spatial-contexts-demo/components/circle-collider.ts):

```typescript
export class CircleCollider {
  constructor(public radius: number) {}
}
```

Collision logic is manually implemented in the [SceneCollisionSystem](apps/client/src/scenes/spatial-contexts-demo/systems/scene-collision.system.ts) using distance squared calculations.

## Proposed Changes

1. **Create `RectangleCollider`**: Implement a new component that holds a `Rectangle` instance (or parameters for one).
2. **Abstract Collision Logic**: Use the `Rectangle` class logic (as proposed in [01-context-entry-region.md](01-context-entry-region.md)) to handle collisions.
3. **Unify Collider Interface**: Ideally, both `CircleCollider` and `RectangleCollider` could implement a common interface or be used by a generalized collision system that handles different primitive types (Circle-Circle, Rect-Rect, Circle-Rect).

## Benefits

- **Flexibility**: Enables non-circular hitboxes for buildings, walls, and items.
- **Composition**: Allows entities to have multiple colliders or different shapes depending on their visual representation.
- **Simplicity**: Users can just add a `RectangleCollider` and trust the physics system to handle it.
