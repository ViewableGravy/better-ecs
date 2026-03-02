# Collision & Query Foundation (Physics + Placement + Culling)

## Why this document exists

You need three things at once:

1. Runtime collisions and resolution (player/world physics).
2. Manual overlap checks (placement, build validation, interaction probes).
3. Fast spatial queries (including render culling), without forcing everything to be a physics participant.

This document defines a single collision/query foundation that supports all three without coupling them incorrectly.

---

## Current state in this repo

### What exists today

- Collider primitives: `RectangleCollider`, `CircleCollider`, `CompoundCollider` in `src/libs/physics/src/colliders`.
- Broadphase builder: `PhysicsWorld` in `src/libs/physics/src/physics-world.ts`.
- Automatic collision usage: `main:spatial-contexts-collision` in `src/app/client/src/scenes/world/systems/scene-collision.system.ts`.
- Placement checks: manual `collides(...)` scans in build-mode placement.

### Important behavior today

- `PhysicsWorld.build(world)` collects all entities with `Transform2D` + collider.
- `PhysicsWorld.broadPhase(sourceBody)` does an `O(n)` scan over all bodies (AABB precheck, no tree/hash index).
- Player collision currently resolves against any candidate that passes broadphase and narrowphase.
- There is no first-class filtering system yet (no category/mask matrix, no query mask).

### Clarification on “spatial pass”

The `spatial-contexts` package is world/context management, not a collider spatial index. It determines visible/focused worlds and transitions, not per-collider broadphase acceleration.

---

## Industry patterns (Factorio/Box2D/Unity/Godot)

Across engines, the common pattern is:

- **Single shape/collider representation** used by many subsystems.
- **Filtering metadata** on shapes (categories/layers/masks) decides participation per use-case.
- **Sensors/triggers** detect overlaps without physical resolution.
- **Separate query filters** for raycast/overlap/culling.

### Relevant references

- Box2D: category/mask filtering, sensors, and query filters.
- Godot/Unity: collision layers + masks (and trigger-style non-resolving overlaps).
- Factorio prototypes: entity `collision_box` + `collision_mask` concepts and grid/build semantics.

The key takeaway: do not solve this with many collider classes. Solve it with a small set of collider primitives plus explicit filter metadata and query policies.

---

## Recommended architecture for Better ECS

## Direct answers to open questions

### Q1) Are the layer names truly engine-agnostic, and can fields target multiple layers?

Yes, but the original example names should be treated as illustrative, not fixed.

Recommended model:

- Engine ships a **small neutral core vocabulary**.
- Games can **register additional channels** without changing physics internals.
- `layers`, `collidesWith`, and `queryableBy` are **bitmasks**, so each field can represent one or many channels.

So `collidesWith` is **not** a single value. Multi-layer collision is normal and expected.

### Q2) Should physics stay a plugin/library or move into engine core?

Keep physics as a **reusable library/plugin** (current direction), with engine-level primitives/interfaces only.

Rationale:

- Different games need different movement and resolution semantics.
- Engine remains unopinionated and focused on composition.
- You can swap/extend physics without forcing all engine users into one model.

Suggested split:

- Engine core: interfaces/types/hooks for collider/query participation.
- Physics package: broadphase/narrowphase/resolve implementation + optional systems.

### Q3) Documentation requirements for filter fields

Agreed: each public field and channel constant must carry JSDoc suitable for IntelliSense.

This is a hard requirement for rollout because collision filtering is otherwise too opaque.

### Q4) Is render-quad-based screen culling still valid?

Yes. Render culling should remain **render-owned** by default.

If the renderer must stay unaware of physics/ECS policy internals, render bounds (quads/sprites/render bounds proxies) are the correct primary source.

Optional adapters are fine (e.g., deriving render bounds from other geometry), but physics colliders should not become a mandatory dependency for render culling.

## 1) Keep primitive collider classes simple

Do **not** overload `RectangleCollider` with behavior flags. Keep it as pure geometry.

Behavior should live in separate metadata components so one collider can be interpreted differently by different systems.

Recommended new component:

```ts
type CollisionChannel = bigint;

type CollisionChannels = {
  /** Physical/static geometry that can block actors. */
  SOLID: CollisionChannel;
  /** Dynamic movers/agents that may resolve physically. */
  ACTOR: CollisionChannel;
  /** Trigger/sensor style overlap volumes. */
  TRIGGER: CollisionChannel;
  /** Generic query target channel for gameplay probes. */
  QUERY: CollisionChannel;
  /** Geometry intended for visibility/culling queries. */
  VISIBILITY: CollisionChannel;
};

type CollisionParticipation = {
  /** Bitmask describing which channels this collider belongs to. */
  layers: bigint;
  /** Bitmask describing which channels this collider can physically collide/resolve with. */
  collidesWith: bigint;
  /** Bitmask describing which query categories are allowed to include this collider. */
  queryableBy: bigint;
  /** If true, overlap can be detected but collision resolution is skipped. */
  isSensor: boolean;
};

type CollisionChannelRegistry = {
  core: CollisionChannels;
  /** Extension point for game-specific channels, assigned to free bits. */
  custom: Record<string, CollisionChannel>;
};
```

This answers your exact concern:

- Conveyor belts can have geometry for placement/query.
- Belts can be excluded from physical resolution.
- Culling can query visibility shapes without making them physical blockers.

## 2) Two-stage filtering (physics + query)

Use two independent checks:

1. **Physics filter** (for automatic collision/resolution):

```txt
(A.layers & B.collidesWith) != 0 && (B.layers & A.collidesWith) != 0
```

2. **Query filter** (for placement/raycast/culling):

```txt
(target.layers & query.mask) != 0 && (target.queryableBy & query.category) != 0
```

This gives you “A sees B but B doesn’t physically resolve against A” safely.

Important:

- All three fields are bitmasks and support multi-channel composition.
- Example: `collidesWith = SOLID | ACTOR` is a normal and intended setup.

## 3) Keep resolution symmetric; put asymmetry in filtering

For rigid collisions, keep narrowphase/resolution logic symmetric and stable.

If you need one-way behavior (example: “placement checks belt occupancy but player movement ignores belts”), do it in filters, not by asymmetric resolve math.

## 4) Single spatial index, multiple query views

Build one broadphase index from all query-relevant colliders each tick (or incrementally), then run filtered queries over it:

- Physics candidate query
- Placement overlap query
- Interaction/raycast query
- Culling bounds query

This avoids maintaining separate trees for each subsystem while still keeping behavior separated by masks.

---

## Practical entity profiles

## A) Solid wall

- layers: `SOLID`
- collidesWith: `ACTOR | SOLID`
- queryableBy: `QUERY | VISIBILITY`
- isSensor: `false`

## B) Conveyor belt (your example)

- layers: `QUERY`
- collidesWith: `0` (or excludes `ACTOR`/`SOLID`)
- queryableBy: `QUERY | VISIBILITY`
- isSensor: `true` or non-sensor with zero collision mask

Result: belt has a hitbox for placement and queries, but does not physically block movement.

## C) Culling-only proxy/bounds

- layers: `VISIBILITY`
- collidesWith: `0`
- queryableBy: `VISIBILITY`
- isSensor: `true`

Result: usable for view queries, ignored by physics and placement.

---

## Suggested API surface

Keep APIs primitive and composable:

```ts
type SpatialQueryFilter = {
  category: bigint;
  mask: bigint;
};

type OverlapQuery = {
  collider: Collider;
  transform: Transform2D;
  filter: SpatialQueryFilter;
};

interface SpatialIndex {
  rebuild(world: UserWorld): void;
  queryAabb(aabb: Aabb, filter: SpatialQueryFilter): EntityId[];
  queryOverlap(query: OverlapQuery): EntityId[];
  queryFirstOverlap(query: OverlapQuery): EntityId | undefined;
}
```

### JSDoc requirement for rollout

Every exported channel constant and every field in `CollisionParticipation` must be documented.

Minimum expectation for each JSDoc entry:

1. What the field/channel means.
2. Whether it affects physics resolution, query inclusion, or both.
3. One concise example.

Example style:

```ts
/**
 * Channels this collider belongs to.
 *
 * Used by both physics and query filtering.
 * Example: `layers = CHANNELS.SOLID | CHANNELS.VISIBILITY`.
 */
layers: bigint;
```

Physics system then does:

1. pull candidate ids via index + physics filter
2. narrowphase `collides(...)`
3. `resolve(...)` only when both entities allow physical resolution

Placement system does:

1. `queryFirstOverlap(...)` with placement filter
2. if any hit -> blocked

---

## Migration plan for this repo

## Phase 1 (low risk)

1. Add `CollisionParticipation` component (or equivalent filter component).
2. Default behavior: if component absent, preserve current behavior.
3. Update `scene-collision.system.ts` to respect physics filter before `collides/resolve`.

## Phase 2

1. Introduce `SpatialIndex` abstraction (backed initially by current `PhysicsWorld` scan).
2. Route placement checks through query filter calls.
3. Mark belts and placement-only blockers with non-physical profiles.
4. Keep render culling on render-owned bounds; add optional adapter only if needed.

## Phase 3

1. Replace scan-based broadphase with spatial hash or tree.
2. Keep same API + filters; only backend changes.
3. Add optional culling queries to use same index.

---

## Decisions to avoid

- Do not create many collider subclasses for each behavior (“PlacementCollider”, “CullingCollider”, etc.).
- Do not use render quads as canonical collision/query geometry.
- Do not fork separate uncoordinated spatial data structures per subsystem too early.

---

## Expected outcome

With this model, you get:

- Placement hitboxes without world physics side-effects.
- Optional one-way interaction semantics through masks.
- A single shared spatial query foundation for physics, placement, interaction, and culling.
- A clear path from current `O(n)` scans to accelerated queries without rewriting systems.
