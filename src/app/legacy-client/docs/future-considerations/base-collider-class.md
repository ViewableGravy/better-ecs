# Future Considerations: Base Collider Class for Unified Querying

## Overview

Currently, the ECS physics system uses separate component classes for different collider types:
- `CircleCollider`
- `RectangleCollider`
- `CompoundCollider`

This requires querying each collider type separately when looking for all entities with colliders, leading to verbose code patterns.

## Problem

When checking if entities have colliders in systems like placement or collision detection, code currently needs to:

```typescript
// Current approach - verbose
for (const entityId of world.query(Transform2D)) {
  const circleCollider = world.get(entityId, CircleCollider);
  const rectCollider = world.get(entityId, RectangleCollider);
  const compoundCollider = world.get(entityId, CompoundCollider);
  
  const collider = circleCollider || rectCollider || compoundCollider;
  if (!collider) continue;
  
  // ... use collider
}
```

## Proposed Solution

Introduce a base `Collider` class that all specific collider types extend from, enabling:

```typescript
// Proposed approach - cleaner
for (const entityId of world.query(Collider)) {
  const collider = world.require(entityId, Collider);
  // ... use collider
}
```

## Implementation Considerations

### ECS Query System Changes Required

The current ECS implementation stores components by their exact class reference. Supporting inheritance-based queries would require:

1. **Component Registration Enhancement**
   - Track class hierarchy when components are added
   - Maintain inverse index mapping base classes to derived classes
   - Update query system to check inheritance chain

2. **Performance Implications**
   - Additional memory overhead for hierarchy tracking
   - Potential query performance impact
   - Need to benchmark against current approach

3. **Breaking Changes**
   - Existing collider components would need to extend base class
   - Migration path for existing code
   - Potential serialization impacts

### Alternative: Tagged Union Pattern

Instead of class inheritance, could use a discriminated union:

```typescript
type Collider = 
  | { type: 'circle', ...CircleCollider }
  | { type: 'rectangle', ...RectangleCollider }
  | { type: 'compound', ...CompoundCollider };
```

But this loses the benefits of the current ECS component architecture.

## Benefits

- **Cleaner Code**: Simpler queries for "any collider"
- **Better Ergonomics**: Reduced boilerplate in collision systems
- **Type Safety**: Maintain strong typing through base class
- **Extensibility**: Easier to add new collider types

## Drawbacks

- **Complexity**: Adds complexity to core ECS system
- **Performance**: Unknown performance implications
- **Breaking Changes**: Requires migration effort
- **Not Urgent**: Current workaround with `getEntityCollider()` utility works

## Current Workaround

The codebase currently uses a utility function pattern:

```typescript
function getEntityCollider(world: UserWorld, entityId: EntityId): Collider | undefined {
  return world.get(entityId, CircleCollider) ||
         world.get(entityId, RectangleCollider) ||
         world.get(entityId, CompoundCollider);
}
```

This provides reasonable ergonomics without ECS changes.

## Decision

**Status**: Deferred

This feature would require significant changes to the core ECS query system to support inheritance-based component queries. The current utility function approach (`getEntityCollider`) provides acceptable ergonomics without framework changes.

Revisit this if:
- Multiple systems need inheritance-based queries
- Performance profiling shows the utility pattern is a bottleneck
- The ECS system is being refactored for other reasons

## Related Files

- `packages/foundation/physics/src/entity/getEntityCollider.ts` - Current utility
- `apps/client/src/scenes/spatial-contexts-demo/systems/build-mode/placement.ts` - Usage example
- `packages/engine/src/ecs/world.ts` - ECS query implementation

## Date

2026-02-16
