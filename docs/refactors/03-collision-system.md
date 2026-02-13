# Generalized Collision System

## User Request

> 3. CollisionSystem
>    I would recommend (if we don't already) creating a system for the demo scene called "collision" or "physics" which handles the logic for collisions between all entities. this would help keep the logic for phsyics/collisions in their own system, very ECS

## Current Implementation

There is a [SceneCollisionSystem](apps/client/src/scenes/spatial-contexts-demo/systems/scene-collision.system.ts) specifically for the spatial contexts demo. It is quite specific to the player and circular colliders:

```typescript
export const SceneCollisionSystem = createSystem("demo:spatial-contexts-collision")({
  phase: "update",
  system() {
    const [playerId] = world.query(PlayerComponent);
    // ... specialized logic for player circles ...
  },
});
```

There are also empty placeholders in [apps/client/src/systems/physics/index.ts](apps/client/src/systems/physics/index.ts) and [apps/client/src/systems/collision/index.ts](apps/client/src/systems/collision/index.ts).

## Proposed Changes

1. **Move Logic to Core/Plugin**: Move the collision resolution logic out of the demo scene and into a more generalized `physics` or `collision` system.
2. **Support Multiple Entities**: The system should iterate over all entities with a collider component, not just the player.
3. **Phase Separation**: Ensure it runs in the `update` phase after movement but before final state commit.
4. **Collision Events**: Optionally, allow the system to emit events (e.g., `onCollision`) that other systems can listen to.

## Benefits

- **Clean ECS Design**: Logic is separated from specific entities (player) and scenes.
- **Reusability**: Other scenes or applications can use the same physics logic.
- **Improved Performance**: A centralized system can more easily be optimized (e.g., using spatial partitioning).
