# Spatial Contexts Architecture: Plugin-Based Implementation Proposal

## Executive Summary

This document proposes a **plugin-based implementation** for **Context-Based Continuous World Scenes** in the Better ECS engine. After analyzing the existing codebase architecture and addressing architectural feedback, this proposal provides:

1. Contexts as a **standalone plugin** (not engine core functionality)
2. Minimal engine modifications (multiple world support only)
3. Plugin-provided scene factory (`createContextScene`)
4. Plugin-managed systems and utilities
5. Zero-cost abstraction for games that don't use contexts

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Plugin vs. Engine Responsibilities](#plugin-vs-engine-responsibilities)
3. [Core Plugin Abstractions](#core-plugin-abstractions)
4. [Engine Modifications Required](#engine-modifications-required)
5. [Implementation Decisions](#implementation-decisions)
6. [API Design](#api-design)
7. [Integration Patterns](#integration-patterns)
8. [Performance Considerations](#performance-considerations)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Code Examples](#code-examples)

---

## Architecture Overview

### Design Philosophy Alignment

The Better ECS engine follows these principles which guide our spatial contexts design:

- **Components are pure data** - No behavior, no cross-references
- **Systems do not call each other** - Communication via shared data
- **Entities are IDs only** - Opaque tagged types
- **Feature-oriented structure** - Not "components vs systems"
- **Zero overhead when unused** - Optional features must not penalize simple games
- **Plugin-based features** - Complex features live as plugins, not engine core

### High-Level Strategy: Plugin Architecture

**Key Insight**: Spatial contexts should be a **plugin** built on engine primitives, not engine functionality.

Spatial contexts will be implemented as:

1. **Plugin package** - `@repo/plugins/contexts` (separate from engine)
2. **Scene factory** - `createContextScene()` wraps `createScene()`
3. **Multiple worlds** - Engine supports multiple active worlds per scene
4. **Plugin-provided systems** - Auto-registered by context scene factory
5. **Plugin-provided utilities** - `useQueryContext()`, `useActiveContext()`, etc.
6. **Zero engine pollution** - No context-specific code in engine core

---

## Plugin vs. Engine Responsibilities

### What Lives in the Plugin

**Package**: `packages/plugins/context-scene/`

1. **Components**
   - `ContextMembership` - Associates entity with a context
   - `ContextPortal` - Transition trigger component
   - `ContextTransitionVolume` - Area-based transition

2. **Systems**
   - `ContextTransitionSystem` - Handles player context transitions
   - `ContextRenderSystem` - Context-aware rendering (optional)
   - `ContextPrefetchSystem` - Proximity-based streaming

3. **Scene Factory**
   - `createContextScene()` - Wraps `createScene()` with context features
   - Auto-registers context systems
   - Manages multiple worlds per scene

4. **Utilities**
   - `useQueryContext()` - Query entities in specific context
   - `useActiveContext()` - Get current player context
   - `useContextWorld()` - Access world for specific context
   - Context definition types and helpers

### What Lives in the Engine (Minimal Changes)

**Package**: `packages/engine/`

1. **Multiple World Support** (NEW)
   - `SceneManager` maintains map of `contextId -> World`
   - `scene.getWorld(contextId?: string)` accessor
   - Default world behavior unchanged (backward compatible)

2. **World Query Helpers** (Enhancement)
   - Existing `world.query()` unchanged
   - Optional filter callbacks for advanced queries

3. **No Context-Specific Code**
   - Engine has no knowledge of "contexts" as a concept
   - Just supports multiple worlds per scene
   - Contexts are a plugin abstraction

---

## Core Plugin Abstractions

### 1. Context Scene Factory

```typescript
// packages/plugins/context-scene/index.ts
export const createContextScene = <TName extends string>(name: TName) => {
  return (config: ContextSceneConfig) => {
    // Wrap user setup with context initialization
    const wrappedSetup = async (world: UserWorld) => {
      const contextManager = initializeContextManager();
      
      // Create worlds for each context
      for (const contextDef of config.contexts) {
        contextManager.registerContext(contextDef);
      }
      
      // Run user setup
      await config.setup(world, contextManager);
    };
    
    // Create underlying scene
    return createScene(name)({
      setup: wrappedSetup,
      teardown: config.teardown,
    });
  };
};
```

**Key Feature**: Automatic context world management without user intervention.

### 2. Context Configuration

```typescript
// packages/plugins/context-scene/types.ts
export interface ContextDefinition {
  id: string;
  parent?: string;
  
  // Rendering hints (used by plugin systems)
  rendering?: {
    renderParent?: boolean;
    parentOpacity?: number;
  };
  
  // Async setup for this context
  setup?: (world: UserWorld) => void | Promise<void>;
}

export interface ContextSceneConfig {
  contexts: ContextDefinition[];
  systems?: SystemFactoryTuple; // Context-specific systems
  setup: (world: UserWorld, contextManager: ContextManager) => void | Promise<void>;
  teardown?: (world: UserWorld) => void | Promise<void>;
}
```

**Key Feature**: Minimal configuration, no excessive nested objects.

### 3. Context Manager (Plugin Internal)

```typescript
// packages/plugins/context-scene/context-manager.ts
export class ContextManager {
  private contextWorlds = new Map<string, World>();
  private activeContext: string;
  
  registerContext(def: ContextDefinition): World;
  getWorld(contextId: string): World | undefined;
  getActiveContext(): string;
  setActiveContext(contextId: string): void;
  queryInContext(contextId: string, ...components: Function[]): EntityId[];
}
```

**Key Feature**: Hidden from users; managed by plugin scene factory.

---

## Engine Modifications Required

### Modification 1: Multiple Worlds Per Scene

**File**: `packages/engine/src/core/scene/scene-manager.ts`

**Current State**: Each scene has exactly one World

**Proposed Change**: Allow scenes to create and manage multiple worlds

```typescript
export class SceneManager {
  // Existing
  #activeWorld: World;
  
  // NEW: Support multiple worlds per scene
  #sceneWorlds: Map<string, Map<string, World>>; // sceneName -> contextId -> World
  
  // NEW: Get world by context ID (backward compatible)
  getWorld(contextId?: string): World {
    if (!contextId) {
      return this.#activeWorld; // Default world
    }
    const sceneWorlds = this.#sceneWorlds.get(this.current!);
    return sceneWorlds?.get(contextId) ?? this.#activeWorld;
  }
  
  // NEW: Register additional world for current scene
  registerWorld(contextId: string, world: World): void {
    if (!this.#sceneWorlds.has(this.current!)) {
      this.#sceneWorlds.set(this.current!, new Map());
    }
    this.#sceneWorlds.get(this.current!)!.set(contextId, world);
  }
}
```

**Impact**: 
- ✅ Backward compatible - default behavior unchanged
- ✅ Minimal - ~20 lines of code
- ✅ Generic - no context-specific logic

### Modification 2: World Query Filtering (Optional Enhancement)

**File**: `packages/engine/src/ecs/world.ts`

**Current State**: `query()` returns all entities with components

**Proposed Change**: Add optional filter callback

```typescript
export class World {
  // Existing query unchanged
  query(...componentTypes: Function[]): EntityId[];
  
  // NEW: Query with filter callback (advanced use)
  queryFiltered(
    filter: (entityId: EntityId) => boolean,
    ...componentTypes: Function[]
  ): EntityId[] {
    const entities = this.query(...componentTypes);
    return entities.filter(filter);
  }
}
```

**Impact**:
- ✅ Optional - existing code unaffected
- ✅ Generic - no context-specific logic
- ✅ Useful for other plugins too

**Alternative**: Plugin can filter after query (no engine change needed)

---

## Implementation Decisions

### Decision 1: Multiple Worlds vs. Component Filtering

**Question**: Should contexts use separate worlds or filter entities by component?

**Original Decision**: Single world with `ContextMembership` component filtering

**REVISED Decision**: **Each context has its own World instance**

**Rationale**:
- ✅ **True isolation** - Physics/rendering systems work on one world at a time
- ✅ **No filtering code** - Systems don't need context awareness
- ✅ **Better performance** - No query overhead when checking many contexts
- ✅ **Simpler mental model** - Context = World, easy to understand
- ✅ **Engine already supports it** - SceneManager can maintain multiple worlds
- ❌ **Slight memory overhead** - Multiple sparse-set stores (acceptable for typical games)

**Implementation Strategy**:
```typescript
// Plugin creates separate worlds
const overworldWorld = new World('overworld');
const interiorWorld = new World('interior');

// Plugin systems operate on specific world
function renderOverworld() {
  const entities = overworldWorld.query(Transform, Sprite);
  // No filtering needed!
}

function renderInterior() {
  const entities = interiorWorld.query(Transform, Sprite);
  // No filtering needed!
}
```

**Key Benefit**: Existing physics/collision systems work without modification!

### Decision 2: System Isolation

**Question**: How do we prevent context entities from affecting each other's physics?

**Answer with Multiple Worlds**: Systems run on one world at a time.

**Example**:
```typescript
// User's collision system (unchanged)
export const CollisionSystem = createSystem("collision")({
  system() {
    const world = useWorld(); // Gets active world from context
    const entities = world.query(Transform, Collider);
    
    // Only entities in THIS context's world are checked
    for (const id of entities) {
      checkCollisions(id, entities);
    }
  }
});
```

**How Plugin Manages This**:
```typescript
// Plugin runs user systems multiple times (once per active context)
for (const [contextId, world] of contextManager.getActiveWorlds()) {
  setActiveWorld(world); // Temporary context switch
  runUserSystems(); // User systems see only this context's entities
  resetActiveWorld();
}
```

**Key Insight**: User systems don't know contexts exist!

### Decision 3: Rendering Integration

**Question**: How does rendering show multiple contexts (e.g., building interior + dimmed exterior)?

**Answer**: Plugin provides optional `ContextRenderSystem` that composites multiple worlds.

**User Can Choose**:

**Option A**: Use plugin's composite render system
```typescript
import { ContextRenderSystem } from '@repo/plugins/context-scene';

const engine = createEngine({
  systems: [
    ContextRenderSystem({ canvas }),
    // Plugin handles multi-world rendering
  ]
});
```

**Option B**: Write custom render system with plugin utilities
```typescript
const CustomRender = createSystem("render")({
  system() {
    const { getVisibleWorlds } = useContextManager();
    
    for (const { world, opacity } of getVisibleWorlds()) {
      const entities = world.query(Transform, Sprite);
      ctx.globalAlpha = opacity;
      renderEntities(entities);
    }
  }
});
```

**Key Benefit**: Plugin provides helpers, but user retains control!

### Decision 4: Entity Transitions

**Question**: How does an entity move between contexts?

**Answer**: Plugin provides `transitionEntity()` utility that moves entity between worlds.

```typescript
// Plugin utility
export function transitionEntity(
  entityId: EntityId,
  fromWorld: World,
  toWorld: World
): void {
  // Get all components
  const components = fromWorld.getAllComponents(entityId);
  
  // Destroy in source world
  fromWorld.destroyEntity(entityId);
  
  // Recreate in target world (same ID)
  toWorld.createEntityWithId(entityId);
  for (const [ComponentType, component] of components) {
    toWorld.addComponent(entityId, ComponentType, component);
  }
}
```

**Usage** (by plugin's transition system):
```typescript
// ContextTransitionSystem (plugin-provided)
const player = world.query(PlayerComponent)[0];
const portal = getPortalPlayerIsNear(player);

if (portal) {
  const fromWorld = contextManager.getWorld(currentContext);
  const toWorld = contextManager.getWorld(portal.targetContext);
  
  transitionEntity(player, fromWorld, toWorld);
  contextManager.setActiveContext(portal.targetContext);
}
```

**Key Requirement**: Engine needs to support `createEntityWithId()` or preserve IDs across worlds.

### Decision 5: Prefetching and Streaming

**Question**: How are contexts loaded/unloaded dynamically?

**Answer**: Plugin system monitors player position and loads nearby context worlds.

**Implementation** (plugin-provided):
```typescript
const ContextPrefetchSystem = createSystem("context:prefetch")({
  system() {
    const { getActiveWorld, loadContext } = useContextManager();
    const world = getActiveWorld();
    
    const player = world.query(PlayerComponent, Transform)[0];
    const nearbyPortals = findNearbyPortals(player, world);
    
    for (const portal of nearbyPortals) {
      if (!contextManager.isLoaded(portal.targetContext)) {
        loadContext(portal.targetContext); // Async load
      }
    }
  }
});
```

**Key Feature**: All loading logic in plugin, not engine!

### Decision 6: Configuration Simplicity

**Question**: How to avoid excessive configuration?

**Answer**: Sensible defaults + minimal required config.

**Minimal Example**:
```typescript
export const GameScene = createContextScene("game")({
  contexts: [
    { id: "overworld" },
    { id: "building_interior", parent: "overworld" }
  ],
  
  async setup(world, contextManager) {
    // Setup entities in each context
    const overworld = contextManager.getWorld("overworld");
    createTrees(overworld);
    
    const interior = contextManager.getWorld("building_interior");
    createFurniture(interior);
  }
});
```

**Advanced Example** (opt-in complexity):
```typescript
export const GameScene = createContextScene("game")({
  contexts: [
    { 
      id: "overworld",
      rendering: { renderParent: false }
    },
    { 
      id: "building_interior", 
      parent: "overworld",
      rendering: { 
        renderParent: true, 
        parentOpacity: 0.3 
      }
    }
  ],
  
  systems: [CustomInteriorPhysics], // Context-specific systems
  
  async setup(world, contextManager) {
    // ... setup code
  }
});
```

---

## API Design

### Plugin Package Structure

```
packages/plugins/context-scene/
├── src/
│   ├── index.ts                    # Public exports
│   ├── create-context-scene.ts     # Scene factory
│   ├── context-manager.ts          # Internal manager
│   ├── components/
│   │   ├── context-portal.ts
│   │   └── transition-volume.ts
│   ├── systems/
│   │   ├── transition.system.ts
│   │   ├── render.system.ts (optional)
│   │   └── prefetch.system.ts
│   ├── utilities/
│   │   ├── use-query-context.ts
│   │   ├── use-active-context.ts
│   │   └── use-context-world.ts
│   └── types.ts
├── package.json
└── README.md
```

### Public API Surface

#### Scene Factory

```typescript
// packages/plugins/context-scene/index.ts
export function createContextScene<TName extends string>(
  name: TName
): (config: ContextSceneConfig) => SceneDefinition<TName>;

export interface ContextSceneConfig {
  contexts: ContextDefinition[];
  systems?: SystemFactoryTuple;
  setup: (world: UserWorld, contextManager: ContextManager) => void | Promise<void>;
  teardown?: (world: UserWorld) => void | Promise<void>;
}

export interface ContextDefinition {
  id: string;
  parent?: string;
  rendering?: {
    renderParent?: boolean;
    parentOpacity?: number;
  };
  setup?: (world: UserWorld) => void | Promise<void>;
}
```

#### Components

```typescript
// packages/plugins/context-scene/components/
export class ContextPortal {
  constructor(
    public targetContext: string,
    public position: { x: number; y: number },
    public offset?: { x: number; y: number }
  ) {}
}

export class ContextTransitionVolume {
  constructor(
    public targetContext: string,
    public bounds: { x: number; y: number; width: number; height: number }
  ) {}
}
```

#### Utilities (Hooks)

```typescript
// packages/plugins/context-scene/utilities/
export function useQueryContext(
  contextId: string,
  ...componentTypes: Function[]
): EntityId[];

export function useActiveContext(): string;

export function useContextWorld(contextId: string): UserWorld | undefined;

export function useContextManager(): ContextManager;
```

#### Systems (Plugin-Provided)

```typescript
// Auto-registered by createContextScene
export const ContextTransitionSystem: SystemFactory;
export const ContextRenderSystem: (opts: RenderOpts) => SystemFactory;
export const ContextPrefetchSystem: SystemFactory;
```

---

## Integration Patterns

### Pattern 1: Simple Two-Context Game (Overworld + Interior)

```typescript
// scenes/game.ts
import { createContextScene } from '@repo/plugins/context-scene';
import { Transform } from '@repo/engine/components';
import { PlayerComponent } from '../components/player';

export const GameScene = createContextScene("game")({
  contexts: [
    { id: "overworld" },
    { 
      id: "building", 
      parent: "overworld",
      rendering: { renderParent: true, parentOpacity: 0.3 }
    }
  ],
  
  async setup(world, contextManager) {
    // Setup overworld
    const overworldWorld = contextManager.getWorld("overworld")!;
    
    const tree = overworldWorld.create();
    overworldWorld.add(tree, Transform, new Transform(100, 100));
    
    const door = overworldWorld.create();
    overworldWorld.add(door, Transform, new Transform(200, 100));
    overworldWorld.add(door, ContextPortal, new ContextPortal("building", { x: 200, y: 100 }));
    
    // Setup building interior
    const buildingWorld = contextManager.getWorld("building")!;
    
    const table = buildingWorld.create();
    buildingWorld.add(table, Transform, new Transform(200, 90));
    
    // Create player in overworld
    const player = overworldWorld.create();
    overworldWorld.add(player, Transform, new Transform(50, 50));
    overworldWorld.add(player, PlayerComponent, new PlayerComponent("Player1"));
    
    // Set active context
    contextManager.setActiveContext("overworld");
  }
});
```

**Key Observations**:
- ✅ No `ContextMembership` component needed (entity's world IS its context)
- ✅ Clean separation of context entities
- ✅ Simple, declarative API

### Pattern 2: Custom Rendering with Multiple Contexts

```typescript
// systems/custom-render.ts
import { createSystem, useEngine } from '@repo/engine';
import { useContextManager } from '@repo/plugins/context-scene';
import { Transform, Sprite } from '../components';

export const CustomRenderSystem = createSystem("custom:render")({
  phase: "render",
  schema: { default: {}, schema: z.object({}) },
  
  system() {
    const ctx = getCanvas().getContext('2d')!;
    const contextManager = useContextManager();
    
    // Get active context and parent (if visible)
    const activeContext = contextManager.getActiveContext();
    const contextDef = contextManager.getDefinition(activeContext);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render parent context (dimmed) if configured
    if (contextDef.parent && contextDef.rendering?.renderParent) {
      const parentWorld = contextManager.getWorld(contextDef.parent)!;
      const entities = parentWorld.query(Transform, Sprite);
      
      ctx.globalAlpha = contextDef.rendering.parentOpacity ?? 0.5;
      renderEntities(entities, parentWorld, ctx);
    }
    
    // Render active context (full opacity)
    const activeWorld = contextManager.getWorld(activeContext)!;
    const entities = activeWorld.query(Transform, Sprite);
    
    ctx.globalAlpha = 1.0;
    renderEntities(entities, activeWorld, ctx);
  }
});
```

**Key Observations**:
- ✅ Plugin utilities provide context information
- ✅ User controls exact rendering behavior
- ✅ Systems work with standard World queries

### Pattern 3: Physics/Collision (No Changes Needed!)

```typescript
// systems/collision.ts (existing system, unchanged)
export const CollisionSystem = createSystem("collision")({
  phase: "update",
  schema: { default: {}, schema: z.object({}) },
  
  system() {
    const world = useWorld(); // Automatically gets correct context world
    const entities = world.query(Transform, Collider);
    
    for (const id of entities) {
      const transform = world.get(id, Transform)!;
      const collider = world.get(id, Collider)!;
      
      // Check collisions within same world (automatic context isolation!)
      for (const otherId of entities) {
        if (id === otherId) continue;
        checkCollision(id, otherId, world);
      }
    }
  }
});
```

**Key Observations**:
- ✅ **No context-aware code needed!**
- ✅ Plugin ensures `useWorld()` returns correct world
- ✅ Entities in different contexts never collide (they're in different worlds)

### Pattern 4: How Plugin Runs User Systems

```typescript
// Plugin internal implementation
// packages/plugins/context-scene/system-runner.ts

export function runSystemsForAllActiveContexts(
  systems: EngineSystem[],
  contextManager: ContextManager
) {
  const activeContexts = contextManager.getActiveContexts();
  
  for (const contextId of activeContexts) {
    const world = contextManager.getWorld(contextId)!;
    
    // Temporarily set active world in engine context
    setActiveWorld(world);
    
    // Run all user systems (they see only this context's world)
    for (const system of systems) {
      if (system.enabled && system.phase === currentPhase) {
        system.system();
      }
    }
    
    // Reset active world
    resetActiveWorld();
  }
}
```

**Key Insight**: Plugin orchestrates system execution across contexts transparently!
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


---

## Performance Considerations

### Overhead Analysis

| Feature | Cost When Unused | Cost When Used |
|---------|------------------|----------------|
| Plugin not imported | Zero bytes | N/A |
| Multiple worlds | Zero (one world as before) | ~8KB per additional world |
| World switching | Zero | ~O(1) pointer swap per context |
| Context queries | Zero | Standard World.query() cost |
| Entity transitions | N/A | ~O(components) to copy between worlds |

### Key Performance Benefits

1. **No Query Filtering Overhead**: Each world contains only its context's entities
2. **Cache-Friendly**: Systems iterate only relevant entities (no skipping)
3. **Parallel-Ready**: Different contexts could run systems in parallel (future)
4. **Memory Efficient**: Unload distant contexts to free memory

### Scalability

Expected performance with contexts enabled:

- **2-5 contexts active**: Negligible overhead (~5%)
- **5-10 contexts active**: Acceptable overhead (~10-15%)
- **10+ contexts**: Requires streaming/unloading (plugin handles this)

---

## Implementation Roadmap

### Phase 1: Engine Foundation (Week 1)

**Goal**: Minimal engine changes to support multiple worlds

1. Add `SceneManager.registerWorld(contextId, world)`
2. Add `SceneManager.getWorld(contextId?)`  
3. Ensure backward compatibility (default world behavior unchanged)
4. Write unit tests for multiple world management

**Deliverable**: Engine supports multiple worlds per scene

### Phase 2: Plugin Core (Week 2)

**Goal**: Basic plugin package with scene factory

1. Create `packages/plugins/context-scene/` package
2. Implement `createContextScene()` factory
3. Implement `ContextManager` class
4. Add `ContextDefinition` types
5. Write plugin unit tests

**Deliverable**: Plugin package with scene factory

### Phase 3: Components & Transitions (Week 3)

**Goal**: Entity transitions between contexts

1. Implement `ContextPortal` component
2. Implement `ContextTransitionVolume` component  
3. Create `ContextTransitionSystem`
4. Add `transitionEntity()` utility
5. Add transition tests

**Deliverable**: Working context transitions

### Phase 4: Utilities & Hooks (Week 4)

**Goal**: Developer-friendly utilities

1. Implement `useQueryContext()`
2. Implement `useActiveContext()`
3. Implement `useContextWorld()`
4. Implement `useContextManager()`
5. Write utility tests

**Deliverable**: Complete utility API

### Phase 5: Rendering Support (Week 5)

**Goal**: Optional rendering helpers

1. Implement `ContextRenderSystem` (optional)
2. Add composite rendering examples
3. Add opacity blending support
4. Create rendering demo

**Deliverable**: Rendering examples and optional system

### Phase 6: Streaming & Prefetch (Week 6)

**Goal**: Large world support

1. Implement `ContextPrefetchSystem`
2. Add async context loading
3. Add proximity-based prefetch
4. Add unload/cleanup logic
5. Create large world stress test

**Deliverable**: Seamless streaming demo

### Phase 7: Documentation & Polish (Week 7)

**Goal**: Production ready

1. Write comprehensive README for plugin
2. Create tutorial: "Building Your First Context Scene"
3. Add TypeScript examples
4. Performance profiling
5. Integration testing with real game

**Deliverable**: Production-ready plugin

---

## Code Examples

### Example 1: Minimal Context Scene

```typescript
// scenes/game.ts
import { createContextScene } from '@repo/plugins/context-scene';
import { Transform, Sprite } from '@repo/engine/components';

export const GameScene = createContextScene("game")({
  contexts: [
    { id: "outside" },
    { id: "inside", parent: "outside" }
  ],
  
  async setup(world, ctx) {
    // Outside world
    const outside = ctx.getWorld("outside")!;
    const tree = outside.create();
    outside.add(tree, new Transform(100, 100));
    outside.add(tree, new Sprite("tree.png"));
    
    // Inside world
    const inside = ctx.getWorld("inside")!;
    const chair = inside.create();
    inside.add(chair, new Transform(50, 50));
    inside.add(chair, new Sprite("chair.png"));
    
    ctx.setActiveContext("outside");
  }
});
```

### Example 2: Using Plugin Utilities in Systems

```typescript
// systems/my-system.ts
import { createSystem } from '@repo/engine';
import { useQueryContext, useActiveContext } from '@repo/plugins/context-scene';

export const MySystem = createSystem("my-system")({
  system() {
    const activeContext = useActiveContext();
    const entities = useQueryContext(activeContext, Transform, MyComponent);
    
    for (const id of entities) {
      // Process entities in active context only
    }
  }
});
```

### Example 3: Custom Multi-Context Rendering

```typescript
import { createSystem } from '@repo/engine';
import { useContextManager } from '@repo/plugins/context-scene';

export const MultiContextRender = createSystem("multi-render")({
  phase: "render",
  system() {
    const ctx = getCanvasContext();
    const contextMgr = useContextManager();
    
    const active = contextMgr.getActiveContext();
    const def = contextMgr.getDefinition(active);
    
    // Render parent (if visible)
    if (def.parent && def.rendering?.renderParent) {
      const parentWorld = contextMgr.getWorld(def.parent)!;
      ctx.globalAlpha = def.rendering.parentOpacity ?? 0.5;
      renderWorld(parentWorld, ctx);
    }
    
    // Render active context
    const activeWorld = contextMgr.getWorld(active)!;
    ctx.globalAlpha = 1.0;
    renderWorld(activeWorld, ctx);
  }
});
```

---

## Addressing Key Concerns

### Concern 1: "How do we exclude context entities from collision without engine knowing about contexts?"

**Solution**: Entities in different contexts are in different `World` instances. When a collision system runs:

```typescript
// User's collision system (no changes)
const world = useWorld(); // Plugin ensures this is correct context world
const entities = world.query(Transform, Collider);

// Only entities in THIS world are checked
// Entities in other contexts don't exist in this query!
```

**Key Insight**: World isolation = automatic context isolation. No engine knowledge of "contexts" needed!

### Concern 2: "How do we support multiple worlds at once?"

**Solution**: Engine modification is minimal:

```typescript
// In SceneManager (engine)
private contextWorlds = new Map<string, Map<string, World>>();

getWorld(contextId?: string): World {
  if (!contextId) return this.#activeWorld; // Default behavior
  return this.contextWorlds.get(this.current!)?.get(contextId) ?? this.#activeWorld;
}
```

**Then plugin manages**:
- Which worlds are active
- How systems run across worlds
- When to switch active world

### Concern 3: "Too much config required?"

**Solution**: Absolute minimum config:

```typescript
createContextScene("game")({
  contexts: [
    { id: "world1" },
    { id: "world2" }
  ],
  
  setup(world, ctx) {
    // Just use ctx.getWorld(id) to setup each context
  }
});
```

All advanced features (rendering policy, prefetch, etc.) are **optional**!

### Concern 4: "How do physics/rendering work without context code?"

**Solution**: Plugin orchestrates system execution:

```typescript
// Plugin runs systems once per active context
for (const contextId of getActiveContexts()) {
  setActiveWorld(contextManager.getWorld(contextId));
  runUserSystem(PhysicsSystem); // Works on current world automatically
}
```

User systems **never know contexts exist**!

---

## Comparison: Before vs. After

### Before (Engine-Based Approach)

```typescript
// ❌ Engine has context types
import { ContextMembership } from '@repo/engine';

// ❌ User adds context components
world.add(entity, ContextMembership, { contextId: "overworld" });

// ❌ Systems must filter by context
const entities = world.query(ContextMembership, Transform);
const filtered = entities.filter(id => {
  const ctx = world.get(id, ContextMembership);
  return ctx.contextId === activeContext;
});
```

**Problems**:
- Engine polluted with context-specific code
- Performance overhead (filtering queries)
- User must write context-aware systems

### After (Plugin-Based Approach)

```typescript
// ✅ Plugin import (opt-in)
import { createContextScene } from '@repo/plugins/context-scene';

// ✅ Entity's world IS its context (implicit)
const worldA = ctx.getWorld("context-a")!;
worldA.add(entity, Transform);

// ✅ Systems work on worlds naturally
const world = useWorld(); // Plugin sets correct world
const entities = world.query(Transform); // Only current context entities!
```

**Benefits**:
- ✅ Engine stays clean and generic
- ✅ Zero query overhead (no filtering)
- ✅ Systems work without context knowledge
- ✅ Plugin handles all complexity

---

## Conclusion

This revised architecture positions **spatial contexts as a plugin** built on minimal engine primitives, addressing all architectural concerns:

### ✅ Key Design Principles Met

1. **Plugin-Based**: Contexts live in `@repo/plugins/context-scene`, not engine core
2. **Minimal Engine Changes**: Only multiple world support (~30 lines)
3. **Zero Configuration Overhead**: Minimal required config, sensible defaults
4. **System Isolation**: User systems work without context awareness
5. **True Performance**: No query filtering, each world contains only its entities

### ✅ Concerns Addressed

- **Context isolation**: Achieved via separate World instances
- **Physics/collision**: Systems automatically isolated by world
- **Multiple worlds**: Engine supports, plugin manages
- **Excessive config**: Minimal required, advanced features optional

### 📦 Deliverable Structure

**Engine Changes** (`packages/engine/`):
- ~30 lines: Multiple world support in SceneManager
- Backward compatible, no breaking changes

**Plugin Package** (`packages/plugins/context-scene/`):
- Scene factory: `createContextScene()`
- Components: `ContextPortal`, `ContextTransitionVolume`
- Systems: Transition, Render (optional), Prefetch
- Utilities: `useQueryContext()`, `useActiveContext()`, etc.
- Zero engine pollution

### 🚀 Next Steps

1. **Review & approve** this plugin-based approach
2. **Phase 1**: Add multiple world support to engine (1 week)
3. **Phase 2**: Build plugin core (1 week)
4. **Phase 3-7**: Complete plugin features (5 weeks)
5. **Demo game**: Prove the architecture with real implementation

The plugin approach achieves all desired functionality while keeping the engine clean, performant, and simple.

---

**Document Version**: 2.0 (Plugin-Based Revision)  
**Date**: 2026-01-31  
**Author**: Architecture Team  
**Status**: Revised Proposal - Addresses Architectural Feedback
