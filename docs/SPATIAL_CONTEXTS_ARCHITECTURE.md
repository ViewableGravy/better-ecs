# Spatial Contexts Architecture: Implementation Proposal

## Executive Summary

This document proposes a concrete implementation strategy for **Context-Based Continuous World Scenes** in the Better ECS engine. After analyzing the existing codebase architecture, this proposal provides:

1. Detailed answers to all open questions from the original proposal
2. Concrete API designs matching existing engine patterns
3. Implementation roadmap aligned with engine philosophy
4. Zero-cost abstractions that preserve simplicity for basic games

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Abstractions](#core-abstractions)
3. [Implementation Decisions](#implementation-decisions)
4. [API Design](#api-design)
5. [Integration with Existing Systems](#integration-with-existing-systems)
6. [Performance Considerations](#performance-considerations)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Code Examples](#code-examples)
9. [Migration Path](#migration-path)

---

## Architecture Overview

### Design Philosophy Alignment

The Better ECS engine follows these principles which guide our spatial contexts design:

- **Components are pure data** - No behavior, no cross-references
- **Systems do not call each other** - Communication via shared data
- **Entities are IDs only** - Opaque tagged types
- **Feature-oriented structure** - Not "components vs systems"
- **Zero overhead when unused** - Optional features must not penalize simple games

### High-Level Strategy

Spatial contexts will be implemented as:

1. **Component-based membership** - Entities have a `ContextMembership` component
2. **Scene-scoped capability** - Context management is a scene-level feature
3. **System-driven visibility and physics** - Context logic lives in dedicated systems
4. **ECS-native partitioning** - Leverage existing World/query patterns
5. **Opt-in feature set** - Games that don't use contexts pay zero cost

---

## Core Abstractions

### 1. ContextId Type

```typescript
// packages/engine/src/ecs/context.ts
export type ContextId = string & { __brand: 'ContextId' };

export function createContextId(name: string): ContextId {
  return name as ContextId;
}
```

**Rationale**: Following the engine's pattern of tagged types (like `EntityId`), contexts are string-based identifiers with type safety.

### 2. ContextMembership Component

```typescript
// packages/engine/src/components/context.ts
export class ContextMembership {
  constructor(
    public contextId: ContextId,
    public isTransitioning: boolean = false
  ) {}
}
```

**Rationale**: Pure data component following engine conventions. The `isTransitioning` flag enables smooth transitions without complex state machines.

### 3. ContextDefinition

```typescript
// packages/engine/src/core/scene/context.types.ts
export interface ContextDefinition {
  id: ContextId;
  parent?: ContextId;
  
  // Rendering policy
  rendering: {
    renderParent: boolean;
    parentOpacity?: number;
    renderChildren: boolean;
  };
  
  // Physics isolation
  physics: {
    isolatedFromParent: boolean;
    isolatedFromSiblings: boolean;
  };
  
  // Streaming hints
  streaming?: {
    prefetchRadius?: number;
    priority?: number;
  };
}
```

**Rationale**: Declarative configuration matching the engine's schema-first approach. This enables context behavior to be data-driven rather than code-driven.

### 4. ContextRegistry (Scene Extension)

```typescript
// packages/engine/src/core/scene/context-registry.ts
export class ContextRegistry {
  private contexts = new Map<ContextId, ContextDefinition>();
  private activeContexts = new Set<ContextId>();
  
  register(definition: ContextDefinition): void;
  get(contextId: ContextId): ContextDefinition | undefined;
  isActive(contextId: ContextId): boolean;
  activate(contextId: ContextId): void;
  deactivate(contextId: ContextId): void;
  getEntityContext(entityId: EntityId, world: UserWorld): ContextId | undefined;
}
```

**Rationale**: Centralized registry per scene, not global. This keeps context state isolated within scene boundaries.

---

## Implementation Decisions

### Decision 1: Context Storage Strategy

**Question**: Should each context have its own ECS world?

**Decision**: **No. Use a single World with component-based partitioning.**

**Rationale**:
- The engine's `World` class is already designed for fast queries via sparse-set storage
- Creating multiple worlds would complicate serialization and entity relationships
- Context isolation can be achieved at the query level (see below)
- Matches the existing pattern: One World per Scene, contexts are subdivisions

**Implementation**:
```typescript
// Context-scoped query helper
export function queryInContext(
  world: UserWorld,
  contextId: ContextId,
  ...componentTypes: Function[]
): EntityId[] {
  const entities = world.query(ContextMembership, ...componentTypes);
  return entities.filter(id => {
    const membership = world.get(id, ContextMembership);
    return membership?.contextId === contextId;
  });
}
```

**Performance Note**: For large worlds, add `SpatialGrid` caching (see Decision 5).

---

### Decision 2: Context Transitions - Portals vs. Volumes

**Question**: Should context transitions use portals, volumes, or both?

**Decision**: **Support both, with volumes as the primary mechanism and portals as syntactic sugar.**

**Rationale**:
- **Volumes** are more flexible and align with existing collision detection patterns
- **Portals** are easier to author for simple doorways
- Both can coexist as components that trigger the same transition logic

**Implementation**:

```typescript
// Core transition component (volumes)
export class ContextTransitionVolume {
  constructor(
    public targetContext: ContextId,
    public bounds: { x: number; y: number; width: number; height: number },
    public bidirectional: boolean = true
  ) {}
}

// Convenience component (portals)
export class ContextPortal {
  constructor(
    public targetContext: ContextId,
    public position: { x: number; y: number },
    public direction: 'north' | 'south' | 'east' | 'west'
  ) {}
}
```

**System Responsibility**:
A dedicated `ContextTransitionSystem` queries entities with `Transform + ContextMembership` and checks for intersections with `ContextTransitionVolume` or `ContextPortal` entities.

---

### Decision 3: Parent-Child vs. Sibling Relationships

**Question**: Should contexts have explicit parent-child relationships, or be flat siblings?

**Decision**: **Explicit parent-child relationships with optional parent reference.**

**Rationale**:
- Building interiors naturally have the overworld as a parent
- Basements have buildings as parents, which have overworld as grandparent
- Parent relationships inform rendering policy (see Decision 4)
- Flat sibling structure doesn't capture the semantic hierarchy

**Hierarchy Example**:
```
Overworld (root)
├── Building_A_Interior
│   └── Building_A_Basement
├── Building_B_Interior
└── Cave_Entrance
    ├── Cave_Level_1
    └── Cave_Level_2
```

**API**:
```typescript
const overworldContext: ContextDefinition = {
  id: createContextId('overworld'),
  parent: undefined, // root context
  rendering: { renderParent: false, renderChildren: false },
  physics: { isolatedFromParent: false, isolatedFromSiblings: true }
};

const buildingInterior: ContextDefinition = {
  id: createContextId('building_a_interior'),
  parent: createContextId('overworld'),
  rendering: { 
    renderParent: true,  // Show overworld through windows
    parentOpacity: 0.3,
    renderChildren: false 
  },
  physics: { 
    isolatedFromParent: true,  // No collision with overworld entities
    isolatedFromSiblings: true // No collision with other buildings
  }
};
```

---

### Decision 4: Visibility Model Implementation

**Question**: How should rendering respect context boundaries?

**Decision**: **Render systems filter entities by active contexts + visibility policies.**

**Rationale**:
- Rendering already happens in dedicated systems (e.g., `apps/client/src/systems/render`)
- Context visibility is a query-time concern, not an entity concern
- The engine's interpolation system (`transformSnapshot`) remains unchanged

**Implementation Pattern**:

```typescript
// In render system
const visibleContexts = contextRegistry.getVisibleContexts(playerContext);

for (const contextId of visibleContexts) {
  const entities = queryInContext(world, contextId, Transform, Sprite);
  const opacity = contextId === playerContext ? 1.0 : 
                  contextRegistry.getParentOpacity(playerContext, contextId);
  
  for (const entityId of entities) {
    renderEntity(entityId, opacity);
  }
}
```

**Visibility Algorithm**:
```typescript
class ContextRegistry {
  getVisibleContexts(activeContext: ContextId): ContextId[] {
    const visible: ContextId[] = [activeContext];
    const def = this.get(activeContext);
    
    if (def?.rendering.renderParent && def.parent) {
      visible.push(def.parent);
    }
    
    if (def?.rendering.renderChildren) {
      visible.push(...this.getChildren(activeContext));
    }
    
    return visible;
  }
}
```

---

### Decision 5: Physics Partitioning

**Question**: How do we partition physics efficiently?

**Decision**: **Spatial Grid + Context-Aware Queries**

**Rationale**:
- The conveyor design doc already identified the need for spatial indexing
- Context-aware physics queries combine spatial grid with context filtering
- Zero overhead when spatial contexts are not used

**Implementation**:

```typescript
// packages/engine/src/ecs/spatial-grid.ts
export class SpatialGrid {
  private grid = new Map<string, Set<EntityId>>();
  
  key(x: number, y: number): string {
    return `${Math.floor(x)},${Math.floor(y)}`;
  }
  
  insert(entityId: EntityId, x: number, y: number): void {
    const key = this.key(x, y);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(entityId);
  }
  
  queryRadius(x: number, y: number, radius: number): EntityId[] {
    const results: EntityId[] = [];
    const cellRadius = Math.ceil(radius);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = this.key(x + dx, y + dy);
        const cell = this.grid.get(key);
        if (cell) {
          results.push(...cell);
        }
      }
    }
    
    return results;
  }
  
  clear(): void {
    this.grid.clear();
  }
}
```

**Context-Aware Physics Query**:
```typescript
// In collision/physics system
function getCollidableEntities(
  entity: EntityId,
  world: UserWorld,
  spatialGrid: SpatialGrid
): EntityId[] {
  const transform = world.get(entity, Transform)!;
  const membership = world.get(entity, ContextMembership);
  
  // Get spatially nearby entities
  const nearby = spatialGrid.queryRadius(transform.curr.x, transform.curr.y, 5);
  
  // Filter by context if entity has context membership
  if (!membership) return nearby;
  
  return nearby.filter(otherId => {
    const otherMembership = world.get(otherId, ContextMembership);
    return !otherMembership || otherMembership.contextId === membership.contextId;
  });
}
```

---

### Decision 6: Prefetching and Streaming

**Question**: How should context prefetching work?

**Decision**: **Async asset loading + lazy entity creation + proximity-based prefetch.**

**Rationale**:
- The engine already supports async scene setup (see `scene.setup(world)`)
- Context streaming is similar to scene loading but at a finer granularity
- Use existing patterns: async functions, promises, and progressive loading

**Streaming Strategy**:

1. **Unloaded**: Context definition exists, no entities spawned
2. **Prefetching**: Assets loading, entities queued but not instantiated
3. **Loaded**: Entities exist in world but with `ContextMembership` preventing rendering/physics
4. **Active**: Context is the player's current context, fully participating

**Implementation**:

```typescript
// packages/engine/src/core/scene/context-loader.ts
export class ContextLoader {
  private loadedContexts = new Set<ContextId>();
  private loadingPromises = new Map<ContextId, Promise<void>>();
  
  async prefetch(contextId: ContextId, loader: () => Promise<void>): Promise<void> {
    if (this.loadedContexts.has(contextId)) return;
    
    if (!this.loadingPromises.has(contextId)) {
      const promise = loader().then(() => {
        this.loadedContexts.add(contextId);
        this.loadingPromises.delete(contextId);
      });
      this.loadingPromises.set(contextId, promise);
    }
    
    return this.loadingPromises.get(contextId);
  }
  
  isLoaded(contextId: ContextId): boolean {
    return this.loadedContexts.has(contextId);
  }
  
  unload(contextId: ContextId, world: UserWorld): void {
    // Remove all entities in this context
    const entities = queryInContext(world, contextId);
    entities.forEach(id => world.destroy(id));
    this.loadedContexts.delete(contextId);
  }
}
```

**Prefetch System**:
```typescript
// Game-level system for proximity-based loading
const ContextPrefetchSystem = createSystem("context:prefetch")({
  phase: "update",
  schema: { default: {}, schema: z.object({}) },
  
  system() {
    const world = useWorld();
    const engine = useEngine();
    const contextLoader = useContextLoader(); // From scene extension
    
    const player = world.query(PlayerComponent, ContextMembership)[0];
    if (!player) return;
    
    const membership = world.get(player, ContextMembership)!;
    const contextDef = engine.scene.contexts.get(membership.contextId);
    
    // Prefetch adjacent contexts (doorways, nearby buildings)
    const adjacentContexts = getAdjacentContexts(membership.contextId, world);
    
    for (const contextId of adjacentContexts) {
      contextLoader.prefetch(contextId, async () => {
        await loadContextAssets(contextId);
        createContextEntities(contextId, world);
      });
    }
  }
});
```

---

### Decision 7: Scene-Scoped Systems

**Question**: How should context-specific systems be scoped to scenes?

**Decision**: **Scene-provided system factories + engine-level system management.**

**Rationale**:
- The engine's current architecture has global systems registered at engine creation
- Adding scene-scoped systems requires minimal API changes
- Systems can be conditionally enabled based on scene context usage

**Proposed Enhancement** (Optional, can defer):

```typescript
// Enhancement to SceneConfig
export interface SceneConfig {
  setup(world: UserWorld): void | Promise<void>;
  teardown?(world: UserWorld): void | Promise<void>;
  systems?: SystemFactoryTuple; // New: scene-specific systems
}

// In SceneManager.set()
async set(sceneName: string): Promise<void> {
  // ... existing teardown and world clearing ...
  
  // Disable previous scene's systems
  if (this.#activeScene?.systems) {
    for (const system of this.#activeScene.systems) {
      this.#engineRef.disableSystem(system.name);
    }
  }
  
  // Enable new scene's systems
  if (newScene.systems) {
    for (const systemFactory of newScene.systems) {
      const system = systemFactory();
      this.#engineRef.registerSystem(system);
    }
  }
  
  // ... rest of setup ...
}
```

**Alternative (Simpler, Recommended for MVP)**:

Use existing system enable/disable pattern:

```typescript
// In scene setup
export const BuildingInteriorScene = createScene("building_interior")({
  setup(world) {
    const engine = useEngine();
    
    // Enable context systems
    engine.systems["context:transitions"].enabled = true;
    engine.systems["context:render"].enabled = true;
    
    // Setup context entities...
  },
  
  teardown(world) {
    const engine = useEngine();
    
    // Disable context systems
    engine.systems["context:transitions"].enabled = false;
    engine.systems["context:render"].enabled = false;
  }
});
```

---

## API Design

### Complete API Surface

Based on the decisions above, here's the complete public API:

#### Components

```typescript
// packages/engine/src/components/context.ts
export class ContextMembership {
  constructor(
    public contextId: ContextId,
    public isTransitioning: boolean = false
  ) {}
}

export class ContextTransitionVolume {
  constructor(
    public targetContext: ContextId,
    public bounds: { x: number; y: number; width: number; height: number },
    public bidirectional: boolean = true
  ) {}
}

export class ContextPortal {
  constructor(
    public targetContext: ContextId,
    public position: { x: number; y: number },
    public direction: 'north' | 'south' | 'east' | 'west',
    public offset: { x: number; y: number } = { x: 0, y: 0 }
  ) {}
}
```

#### Types

```typescript
// packages/engine/src/ecs/context.ts
export type ContextId = string & { __brand: 'ContextId' };

export function createContextId(name: string): ContextId {
  return name as ContextId;
}

export interface ContextDefinition {
  id: ContextId;
  parent?: ContextId;
  rendering: {
    renderParent: boolean;
    parentOpacity?: number;
    renderChildren: boolean;
  };
  physics: {
    isolatedFromParent: boolean;
    isolatedFromSiblings: boolean;
  };
  streaming?: {
    prefetchRadius?: number;
    priority?: number;
  };
}
```

#### Registry and Utilities

```typescript
// packages/engine/src/core/scene/context-registry.ts
export class ContextRegistry {
  register(definition: ContextDefinition): void;
  get(contextId: ContextId): ContextDefinition | undefined;
  getAll(): ContextDefinition[];
  isActive(contextId: ContextId): boolean;
  activate(contextId: ContextId): void;
  deactivate(contextId: ContextId): void;
  getEntityContext(entityId: EntityId, world: UserWorld): ContextId | undefined;
  getVisibleContexts(activeContext: ContextId): ContextId[];
  getParentOpacity(fromContext: ContextId, toContext: ContextId): number;
}

// packages/engine/src/ecs/spatial-grid.ts
export class SpatialGrid {
  insert(entityId: EntityId, x: number, y: number): void;
  remove(entityId: EntityId, x: number, y: number): void;
  queryRadius(x: number, y: number, radius: number): EntityId[];
  queryRect(x: number, y: number, width: number, height: number): EntityId[];
  clear(): void;
}

// packages/engine/src/core/scene/context-loader.ts
export class ContextLoader {
  prefetch(contextId: ContextId, loader: () => Promise<void>): Promise<void>;
  isLoaded(contextId: ContextId): boolean;
  unload(contextId: ContextId, world: UserWorld): void;
}
```

#### Query Helpers

```typescript
// packages/engine/src/ecs/context-queries.ts
export function queryInContext(
  world: UserWorld,
  contextId: ContextId,
  ...componentTypes: Function[]
): EntityId[];

export function queryMultipleContexts(
  world: UserWorld,
  contextIds: ContextId[],
  ...componentTypes: Function[]
): EntityId[];
```

#### Scene Extension

```typescript
// Extended SceneManager
interface SceneManager {
  // Existing methods...
  world: UserWorld;
  current: string | null;
  set(sceneName: string): Promise<void>;
  
  // New: Context management
  contexts: ContextRegistry;
  spatialGrid: SpatialGrid;
  contextLoader: ContextLoader;
}
```

---

## Integration with Existing Systems

### Rendering System Integration

The existing rendering system (`apps/client/src/systems/render`) needs minimal changes:

**Before (Simple rendering)**:
```typescript
const entities = world.query(Transform, Sprite);
for (const id of entities) {
  renderEntity(id);
}
```

**After (Context-aware rendering)**:
```typescript
const player = world.query(PlayerComponent, ContextMembership)[0];
const playerContext = player 
  ? world.get(player, ContextMembership)?.contextId 
  : undefined;

const visibleContexts = playerContext
  ? engine.scene.contexts.getVisibleContexts(playerContext)
  : [undefined]; // No contexts = render everything

for (const contextId of visibleContexts) {
  const entities = contextId
    ? queryInContext(world, contextId, Transform, Sprite)
    : world.query(Transform, Sprite);
    
  const opacity = getContextOpacity(playerContext, contextId);
  
  for (const id of entities) {
    renderEntity(id, opacity);
  }
}
```

### Physics/Collision System Integration

**Before (Simple collision)**:
```typescript
const entities = world.query(Transform, Collider);
for (const id of entities) {
  checkCollisions(id, entities);
}
```

**After (Context + Spatial Grid)**:
```typescript
// Build spatial grid each frame
const spatialGrid = engine.scene.spatialGrid;
spatialGrid.clear();

const entities = world.query(Transform, Collider);
for (const id of entities) {
  const transform = world.get(id, Transform)!;
  spatialGrid.insert(id, transform.curr.x, transform.curr.y);
}

// Check collisions with context awareness
for (const id of entities) {
  const nearby = getCollidableEntities(id, world, spatialGrid);
  checkCollisions(id, nearby);
}
```

### Input/Movement System Integration

No changes required. Movement systems write to `Transform`, collision systems enforce boundaries regardless of context.

---

## Performance Considerations

### Overhead Analysis

| Feature | Cost When Unused | Cost When Used |
|---------|------------------|----------------|
| `ContextMembership` component | Zero | ~4 bytes per entity |
| Context queries | Zero (standard query) | ~10% query overhead |
| Spatial grid | Zero (not allocated) | ~O(n) insertion per frame |
| Visibility filtering | Zero | ~O(contexts) per frame |
| Physics filtering | Zero | ~O(nearby entities) |

### Optimization Strategies

1. **Lazy Allocation**: Only create `SpatialGrid` and `ContextRegistry` when first context is registered
2. **Query Caching**: Cache context-filtered queries per frame
3. **Spatial Grid Cell Size**: Tune based on game scale (default: 1 unit = 1 cell)
4. **Batched Rendering**: Group entities by context for fewer draw calls
5. **Archetype Affinity**: Entities in same context likely have similar components

### Scalability

Expected performance with contexts enabled:

- **1,000 entities, 5 contexts**: Negligible overhead (<5%)
- **10,000 entities, 20 contexts**: ~10-15% overhead vs. no contexts
- **100,000+ entities**: Requires additional optimizations (chunking, LOD)

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)

**Goal**: Foundation without breaking existing code

1. Add `ContextId` type and `createContextId` function
2. Implement `ContextMembership` component
3. Add `ContextDefinition` interface
4. Create `ContextRegistry` class
5. Extend `SceneManager` with `contexts` property
6. Add `queryInContext` helper
7. Write unit tests for all new types

**Deliverable**: Context types and registry available, zero impact on existing games

### Phase 2: Spatial Infrastructure (Week 3)

**Goal**: Enable efficient spatial queries

1. Implement `SpatialGrid` class
2. Add to `SceneManager` as optional property
3. Create helper: `getCollidableEntities`
4. Update example collision system to use spatial grid
5. Benchmark: measure overhead of spatial grid updates

**Deliverable**: Spatial grid available as opt-in feature

### Phase 3: Context Transitions (Week 4)

**Goal**: Players can move between contexts

1. Implement `ContextTransitionVolume` component
2. Implement `ContextPortal` component (simpler alternative)
3. Create `ContextTransitionSystem`
4. Add transition logic (update `ContextMembership`)
5. Handle transition animations (optional)
6. Write integration tests

**Deliverable**: Working context transitions in demo game

### Phase 4: Visibility and Rendering (Week 5)

**Goal**: Context-aware rendering

1. Update demo render system to use `getVisibleContexts`
2. Implement opacity blending for parent contexts
3. Add camera positioning during transitions
4. Performance testing with multiple contexts active
5. Create demo: building interior with overworld visible

**Deliverable**: Visual demo of layered rendering

### Phase 5: Prefetching and Streaming (Week 6)

**Goal**: Seamless transitions with large worlds

1. Implement `ContextLoader` class
2. Create `ContextPrefetchSystem`
3. Add async asset loading hooks
4. Implement proximity-based prefetch
5. Add memory management (unload distant contexts)
6. Stress test with 50+ contexts

**Deliverable**: Large world demo with no loading screens

### Phase 6: Documentation and Polish (Week 7)

**Goal**: Production ready

1. Write comprehensive usage guide
2. Create tutorial: "Adding contexts to your game"
3. Add TypeScript examples to all APIs
4. Performance profiling and optimization
5. Breaking change review
6. Final integration testing

**Deliverable**: Documented, tested, production-ready feature

---

## Code Examples

### Example 1: Simple Building Interior

```typescript
// Define contexts
const overworld = {
  id: createContextId('overworld'),
  rendering: { renderParent: false, renderChildren: false },
  physics: { isolatedFromParent: false, isolatedFromSiblings: true }
};

const buildingInterior = {
  id: createContextId('building_a'),
  parent: createContextId('overworld'),
  rendering: { 
    renderParent: true, 
    parentOpacity: 0.2,
    renderChildren: false 
  },
  physics: { 
    isolatedFromParent: true,
    isolatedFromSiblings: true
  }
};

// In scene setup
export const GameScene = createScene("game")({
  setup(world) {
    const engine = useEngine();
    
    // Register contexts
    engine.scene.contexts.register(overworld);
    engine.scene.contexts.register(buildingInterior);
    
    // Create overworld entities
    const tree = world.create();
    world.add(tree, Transform, new Transform(100, 100));
    world.add(tree, Sprite, { texture: 'tree.png' });
    world.add(tree, ContextMembership, 
      new ContextMembership(createContextId('overworld')));
    
    // Create building doorway
    const door = world.create();
    world.add(door, Transform, new Transform(200, 100));
    world.add(door, ContextPortal, new ContextPortal(
      createContextId('building_a'),
      { x: 200, y: 100 },
      'north'
    ));
    world.add(door, ContextMembership,
      new ContextMembership(createContextId('overworld')));
    
    // Create building interior furniture
    const table = world.create();
    world.add(table, Transform, new Transform(200, 90));
    world.add(table, Sprite, { texture: 'table.png' });
    world.add(table, ContextMembership,
      new ContextMembership(createContextId('building_a')));
    
    // Create player
    const player = world.create();
    world.add(player, Transform, new Transform(50, 50));
    world.add(player, PlayerComponent, new PlayerComponent('Player1'));
    world.add(player, ContextMembership,
      new ContextMembership(createContextId('overworld')));
  }
});
```

### Example 2: Context Transition System

```typescript
export const ContextTransitionSystem = createSystem("context:transitions")({
  phase: "update",
  schema: { 
    default: { 
      transitionCooldown: 0 
    }, 
    schema: z.object({ 
      transitionCooldown: z.number() 
    }) 
  },
  
  system() {
    const world = useWorld();
    const { data } = useSystem("context:transitions");
    
    if (data.transitionCooldown > 0) {
      data.transitionCooldown--;
      return;
    }
    
    // Check for portal transitions
    const portals = world.query(ContextPortal, Transform);
    const players = world.query(PlayerComponent, Transform, ContextMembership);
    
    for (const playerId of players) {
      const playerTransform = world.get(playerId, Transform)!;
      const playerContext = world.get(playerId, ContextMembership)!;
      
      for (const portalId of portals) {
        const portal = world.get(portalId, ContextPortal)!;
        const portalTransform = world.get(portalId, Transform)!;
        
        const distance = Math.hypot(
          playerTransform.curr.x - portalTransform.curr.x,
          playerTransform.curr.y - portalTransform.curr.y
        );
        
        if (distance < 2) {
          // Transition player to new context
          playerContext.contextId = portal.targetContext;
          playerContext.isTransitioning = true;
          
          // Apply portal offset
          playerTransform.curr.x += portal.offset.x;
          playerTransform.curr.y += portal.offset.y;
          
          data.transitionCooldown = 30; // 3 seconds at 10 UPS
          
          console.log(`Player entered context: ${portal.targetContext}`);
        }
      }
    }
  }
});
```

### Example 3: Context-Aware Rendering

```typescript
export const ContextRenderSystem = createSystem("context:render")({
  phase: "render",
  schema: { default: {}, schema: z.object({}) },
  
  system() {
    const world = useWorld();
    const engine = useEngine();
    const canvas = getCanvas();
    const ctx = canvas.getContext('2d')!;
    
    // Find player's context
    const players = world.query(PlayerComponent, ContextMembership);
    const playerContext = players[0] 
      ? world.get(players[0], ContextMembership)?.contextId 
      : undefined;
    
    if (!playerContext) {
      // No contexts active, render everything
      renderAllEntities(world, ctx);
      return;
    }
    
    // Get visible contexts based on player's location
    const visibleContexts = engine.scene.contexts.getVisibleContexts(playerContext);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render each visible context with appropriate opacity
    for (const contextId of visibleContexts) {
      const opacity = engine.scene.contexts.getParentOpacity(playerContext, contextId);
      
      const entities = queryInContext(world, contextId, Transform, Sprite);
      
      ctx.globalAlpha = opacity;
      
      for (const entityId of entities) {
        renderEntity(entityId, world, ctx);
      }
    }
    
    ctx.globalAlpha = 1.0;
  }
});

function renderEntity(entityId: EntityId, world: UserWorld, ctx: CanvasRenderingContext2D) {
  const transform = world.get(entityId, Transform)!;
  const sprite = world.get(entityId, Sprite)!;
  
  // Use engine's interpolation
  const engine = useEngine();
  const interpolated = interpolateTransform(transform, engine.frame.updateProgress);
  
  ctx.drawImage(
    sprite.texture,
    interpolated.x - sprite.width / 2,
    interpolated.y - sprite.height / 2
  );
}
```

### Example 4: Prefetching Adjacent Contexts

```typescript
export const ContextPrefetchSystem = createSystem("context:prefetch")({
  phase: "update",
  priority: -100, // Run early
  schema: { default: {}, schema: z.object({}) },
  
  system() {
    const world = useWorld();
    const engine = useEngine();
    const loader = engine.scene.contextLoader;
    
    const players = world.query(PlayerComponent, Transform, ContextMembership);
    if (players.length === 0) return;
    
    const playerId = players[0];
    const playerTransform = world.get(playerId, Transform)!;
    const playerContext = world.get(playerId, ContextMembership)!;
    
    // Find nearby portals/transition volumes
    const portals = world.query(ContextPortal, Transform);
    
    for (const portalId of portals) {
      const portal = world.get(portalId, ContextPortal)!;
      const portalTransform = world.get(portalId, Transform)!;
      
      const distance = Math.hypot(
        playerTransform.curr.x - portalTransform.curr.x,
        playerTransform.curr.y - portalTransform.curr.y
      );
      
      // Prefetch contexts within 50 units
      if (distance < 50) {
        const targetContext = portal.targetContext;
        
        if (!loader.isLoaded(targetContext)) {
          loader.prefetch(targetContext, async () => {
            console.log(`Prefetching context: ${targetContext}`);
            await loadContextAssets(targetContext);
            createContextEntities(targetContext, world);
          });
        }
      }
    }
  }
});
```

---

## Migration Path

### For Existing Simple Games

**Zero Migration Required**

Games that don't use contexts continue to work unchanged:
- No `ContextMembership` components = all entities behave as before
- No context queries = standard queries work as always
- No spatial grid = no overhead

### For Games Adding Contexts

**Step-by-step adoption**:

1. **Start small**: Add contexts to one scene first
2. **Incremental component adoption**: Add `ContextMembership` to new entities
3. **Progressive system updates**: Migrate rendering, then physics, then AI
4. **Test at each stage**: Ensure existing gameplay remains functional

### Breaking Changes

**None anticipated**. All context features are opt-in additions.

### Deprecation Plan

**Not applicable** - This is a new feature, not a replacement.

---

## Appendix: Open Questions Resolved

### 1. Portal vs. Volume-Based Transitions ✅

**Answer**: Support both. Volumes for flexible areas, portals for simple doorways. Both trigger the same `ContextTransitionSystem` logic.

### 2. Parent-Child vs. Sibling Context Relationships ✅

**Answer**: Explicit parent-child with `parent?: ContextId` field. Enables natural hierarchy and rendering policies.

### 3. ECS World Partitioning Strategy ✅

**Answer**: Single World per Scene, use component-based queries with `queryInContext`. Avoid world fragmentation.

### 4. Prefetching and Streaming Strategy ✅

**Answer**: Async loading with `ContextLoader`, proximity-based prefetch via dedicated system, lazy entity creation.

### 5. Scene-Scoped System Registration ✅

**Answer**: Use existing system enable/disable pattern for MVP. Future enhancement: scene-provided system factories.

---

## Conclusion

This architecture proposal provides a concrete, implementable path for spatial contexts in Better ECS. The design:

- ✅ **Maintains engine philosophy**: Data-driven, component-based, zero-cost when unused
- ✅ **Integrates cleanly**: Builds on existing World, Scene, and System patterns
- ✅ **Scales gracefully**: From simple games to complex open worlds
- ✅ **Preserves performance**: Spatial grid and context queries are O(n) operations
- ✅ **Enables rich gameplay**: Buildings, caves, interiors, multiplayer contexts

The phased implementation roadmap allows incremental development and testing, ensuring stability at each stage.

**Next Steps**:
1. Review and approval of this proposal
2. Begin Phase 1 implementation (Core Infrastructure)
3. Create proof-of-concept demo game with simple building interior
4. Iterate based on real-world usage and feedback

---

**Document Version**: 1.0  
**Date**: 2026-01-31  
**Author**: Architecture Team  
**Status**: Proposal - Pending Review
