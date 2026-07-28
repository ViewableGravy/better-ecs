---
name: physics-collisions
description: Architecture and workflow guidance for Better ECS physics world snapshots, collision layers, filtering, and gameplay queries.
---

# Physics + Collisions

## Purpose

Provide a single, implementation-accurate guide for working with the current physics/collision stack in Better ECS, including layer participation, query APIs, frame snapshot lifecycle, and placement-specific behavior.

## When to use

- Adding or modifying colliders on gameplay entities.
- Implementing physics resolution, overlap queries, or layer-filtered lookups.
- Working on build-mode placement, conveyor replacement, or collision debugging.

## Architecture map

- `CollisionParticipation` and channels: [src/libs/physics/src/entity/collision-participation.ts](../../../src/libs/physics/src/entity/collision-participation.ts)
- Layer/query filter helpers: [src/libs/physics/src/filters.ts](../../../src/libs/physics/src/filters.ts)
- Physics world snapshot/query API: [src/libs/physics/src/physics-world.ts](../../../src/libs/physics/src/physics-world.ts)
- Public physics exports: [src/libs/physics/src/index.ts](../../../src/libs/physics/src/index.ts)
- Per-frame world cache manager: [src/app/client/src/scenes/world/physics/physics-world-manager.ts](../../../src/app/client/src/scenes/world/physics/physics-world-manager.ts)
- Frame sync system: [src/app/client/src/systems/physics-world-sync.ts](../../../src/app/client/src/systems/physics-world-sync.ts)

## Core model

1. Entities participate in physics/query only when they have both a collider (`CircleCollider`, `RectangleCollider`, `CompoundCollider`) and `CollisionParticipation`.
2. Layer checks use bigint masks (`COLLISION_LAYERS`), not enum/string comparisons.
3. Physics resolution and gameplay queries are filtered independently:
   - Physics resolution eligibility: `canResolvePhysicsPair(...)`
   - Query inclusion: `matchesSpatialQuery(...)`
4. `PhysicsWorld` is a per-world snapshot built once per frame and reused by systems.

## Runtime workflow

1. `main:physics-world-sync` calls `PhysicsWorldManager.beginFrame(engine.scene.context.worlds)`.
2. Systems call `PhysicsWorldManager.requireWorld(world)` and query that snapshot.
3. Common query patterns:
   - Layer iteration: `physicsWorld.layers(mask)`
   - Layer + component: `physicsWorld.queryLayer(mask, Component)`
   - Single layer + component: `physicsWorld.queryFirstLayer(mask, Component)`
   - Overlap checks: `queryOverlap(...)`, `queryFirstOverlap(...)`

## Placement/conveyor rules

- Placement uses query filters against `SOLID | CONVEYOR` masks.
- Grid-snapped colliders should be inset by 1px per side to avoid adjacent-tile overlap artifacts.
- Conveyor placement/replacement must use belt-centered overlap queries (not tile-center approximation) and only replace overlaps on the same grid coordinate.
- Current implementation reference: [src/app/client/src/scenes/world/systems/build-mode/placement.ts](../../../src/app/client/src/scenes/world/systems/build-mode/placement.ts)

## Debugging hitboxes

- Physics debug system renders collider proxies for entities that have colliders.
- Toggle key is configured by the client plugin (`KeyH`): [src/app/client/src/plugins/physics.ts](../../../src/app/client/src/plugins/physics.ts)
- Debug proxy sync implementation: [src/libs/physics/src/plugin/debug-system.ts](../../../src/libs/physics/src/plugin/debug-system.ts)

## Guardrails

- Do not call `new PhysicsWorld().build(...)` ad hoc inside gameplay systems; use `PhysicsWorldManager.requireWorld(...)`.
- Do not add compatibility shims for pre-participation entities; attach `CollisionParticipation` explicitly.
- Keep physics colliders as pure geometry; encode behavior via participation masks/sensor flags.

## Verification

- `bun x nx run physics:typecheck`
- `bun x nx run client:typecheck`
- `bun x nx run client:lint`
