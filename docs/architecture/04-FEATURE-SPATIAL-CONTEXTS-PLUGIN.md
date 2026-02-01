# Feature: Spatial Contexts Plugin

## Part 1: Public API & User Experience

### Overview

The Spatial Contexts Plugin provides a comprehensive system for managing multiple world contexts within a scene. Each context represents an independent simulation space (e.g., overworld, houses, caves), orchestrated by plugin systems rather than engine core.

---

### User-Facing API

#### Creating a Context Scene

```typescript
import { createContextScene } from "@repo/plugins/spatial-contexts";
import { createEngine } from "@repo/engine/core";

// Define scene with spatial contexts
const GameScene = createContextScene("game")({
  // Optional: Additional contexts beyond default
  contexts: [
    {
      id: "house_1",
      parent: "game", // Parent is the scene's default context
      rendering: {
        renderParent: true,
        parentOpacity: 0.3
      },
      async setup(world) {
        // Setup entities in this context
        createHouseInterior(world);
      }
    },
    {
      id: "cave_entrance",
      parent: "game"
    }
  ],
  
  // Scene setup (has access to context manager)
  async setup(world, contextManager) {
    // 'world' is the default context ("game")
    // 'contextManager' provides context operations
    
    // Create overworld content
    createOverworldEntities(world);
    
    // Create portals to other contexts
    createPortal(world, { target: "house_1", position: { x: 10, y: 5 } });
    createPortal(world, { target: "cave_entrance", position: { x: -5, y: 10 } });
  }
});

const engine = createEngine({
  scene: GameScene,
  systems: [
    // Plugin auto-registers context systems
    // User adds gameplay systems
    playerMovementSystem,
    cameraFollowSystem
  ]
});
```

---

#### Context Manager Hooks

```typescript
import { 
  useContextManager, 
  useActiveContext, 
  useContextWorld 
} from "@repo/plugins/spatial-contexts";

// Get active context ID
const mySystem = createSystem("mySystem")({
  system() {
    const activeContextId = useActiveContext();
    console.log(`Player is in: ${activeContextId}`);
  }
});

// Access specific context world
const renderSystem = createSystem("render")({
  phase: "render",
  system() {
    const overworld = useContextWorld("game"); // Get default/parent context
    const house = useContextWorld("house_1"); // Get child context
    
    // Render both
    renderWorld(overworld, { opacity: 0.3 });
    renderWorld(house, { opacity: 1.0 });
  }
});

// Access context manager for advanced operations
const transitionSystem = createSystem("transition")({
  system() {
    const contextManager = useContextManager();
    
    // Get parent of current context
    const activeContext = contextManager.getActiveContext();
    const parent = contextManager.getParent(activeContext);
    
    // Transition to different context
    if (playerWantsToExit) {
      contextManager.transitionTo(parent);
    }
  }
});
```

---

#### Portal Component and System

```typescript
import { Portal } from "@repo/plugins/spatial-contexts/components";
import { Transform } from "@repo/engine/components";

// Create portal entity
const portal = world.create();
world.add(portal, Transform, { x: 10, y: 5 });
world.add(portal, Portal, {
  targetContext: "house_1",
  transition: "fade",
  requireInteraction: true // Press button vs automatic
});

// Portal system (auto-registered by plugin)
// Detects when player enters portal and triggers transition
```

---

### User Experience Examples

#### Example 1: Simple House Interior

```typescript
const GameScene = createContextScene("overworld")({
  contexts: [
    {
      id: "player_house",
      parent: "overworld",
      setup(world) {
        // Create furniture
        const chair = world.create();
        world.add(chair, Transform, { x: 2, y: 3 });
        world.add(chair, Sprite, { texture: "chair.png" });
        
        const table = world.create();
        world.add(table, Transform, { x: 2, y: 5 });
        world.add(table, Sprite, { texture: "table.png" });
      }
    }
  ],
  
  setup(world) {
    // Create overworld
    createOverworld(world);
    
    // Create portal to house
    const houseDoor = world.create();
    world.add(houseDoor, Transform, { x: 50, y: 30 });
    world.add(houseDoor, Portal, { targetContext: "player_house" });
  }
});
```

#### Example 2: Composite Rendering

```typescript
const compositeRenderSystem = createSystem("compositeRender")({
  phase: "render",
  
  system() {
    const contextManager = useContextManager();
    const renderer = useRenderer();
    
    const activeContextId = contextManager.getActiveContext();
    const parentContextId = contextManager.getParent(activeContextId);
    
    // Clear screen
    renderer.clear(0, 0, 0, 1);
    
    // Render parent context as backdrop (if exists)
    if (parentContextId) {
      const parentWorld = useContextWorld(parentContextId);
      renderWorldWithEffects(renderer, parentWorld, {
        opacity: 0.3,
        blur: 2,
        desaturate: 0.5
      });
    }
    
    // Render active context
    const activeWorld = useContextWorld(activeContextId);
    renderWorldWithEffects(renderer, activeWorld, {
      opacity: 1.0,
      blur: 0,
      desaturate: 0
    });
  }
});
```

#### Example 3: Context Streaming

```typescript
const streamingSystem = createSystem("streaming")({
  scope: "scene",
  
  system() {
    const contextManager = useContextManager();
    const playerPosition = getPlayerPosition();
    
    // Preload nearby contexts
    for (const contextDef of contextManager.getAllContexts()) {
      const distance = calculateDistance(playerPosition, contextDef);
      
      if (distance < 100 && !contextManager.isLoaded(contextDef.id)) {
        contextManager.loadContext(contextDef.id);
      }
      
      if (distance > 200 && contextManager.isLoaded(contextDef.id)) {
        contextManager.unloadContext(contextDef.id);
      }
    }
  }
});
```

---

### Plugin-Provided Components

```typescript
// Portal component
class Portal {
  targetContext: string;
  transition?: "fade" | "instant" | "slide";
  requireInteraction?: boolean;
  enabled: boolean = true;
}

// Context membership (internal, usually auto-managed)
class ContextMembership {
  contextId: string;
}
```

---

## Part 2: Internal Implementation Steps

### Story 1: Create Plugin Package Structure

**Files:**
- `packages/plugins/spatial-contexts/package.json`
- `packages/plugins/spatial-contexts/tsconfig.json`
- `packages/plugins/spatial-contexts/src/index.ts`

**Steps:**
1. Create package directory
2. Setup package.json with dependencies
3. Configure TypeScript
4. Setup exports
5. Add to workspace

**Acceptance:**
- [ ] Package builds successfully
- [ ] Can be imported from other packages
- [ ] TypeScript compilation works

---

### Story 2: Implement ContextManager Core

**Files:**
- `packages/plugins/spatial-contexts/src/context-manager.ts`
- `packages/plugins/spatial-contexts/src/types.ts`

**Steps:**
1. Define `ContextDefinition` and `ContextConfig` types
2. Create `ContextManager` class
3. Implement context registry (Map<contextId, ContextState>)
4. Implement world registry (Map<contextId, World>)
5. Add active context tracking
6. Add parent/child relationship management

**Implementation:**
```typescript
export class ContextManager {
  private contexts = new Map<string, ContextDefinition>();
  private worlds = new Map<string, World>();
  private activeContextId: string;
  private sceneId: string;
  
  constructor(sceneId: string, defaultWorld: World) {
    this.sceneId = sceneId;
    this.activeContextId = sceneId;
    
    // Register default context
    this.contexts.set(sceneId, {
      id: sceneId,
      parent: undefined
    });
    this.worlds.set(sceneId, defaultWorld);
  }
  
  registerContext(def: ContextDefinition): World {
    if (this.contexts.has(def.id)) {
      throw new Error(`Context ${def.id} already registered`);
    }
    
    this.contexts.set(def.id, def);
    
    // Create world for context
    const world = new World(def.id);
    this.worlds.set(def.id, world);
    
    // Run setup if provided
    if (def.setup) {
      def.setup(new UserWorld(world));
    }
    
    return world;
  }
  
  getWorld(contextId: string): World | undefined {
    return this.worlds.get(contextId);
  }
  
  getActiveContext(): string {
    return this.activeContextId;
  }
  
  setActiveContext(contextId: string): void {
    if (!this.contexts.has(contextId)) {
      throw new Error(`Context ${contextId} not registered`);
    }
    this.activeContextId = contextId;
  }
  
  getParent(contextId: string): string | undefined {
    return this.contexts.get(contextId)?.parent;
  }
  
  getAllContexts(): ContextDefinition[] {
    return Array.from(this.contexts.values());
  }
  
  transitionTo(targetContextId: string): void {
    this.setActiveContext(targetContextId);
    // Fire transition event
  }
}
```

**Acceptance:**
- [ ] Can register contexts
- [ ] Can manage multiple worlds
- [ ] Parent/child tracking works
- [ ] Active context switching works

---

### Story 3: Create Context Scene Factory

**Files:**
- `packages/plugins/spatial-contexts/src/create-context-scene.ts`

**Steps:**
1. Create `createContextScene()` factory function
2. Wrap `createScene()` from engine
3. Initialize `ContextManager` in wrapped setup
4. Register default context automatically
5. Register additional contexts from config
6. Pass context manager to user setup

**Implementation:**
```typescript
export const createContextScene = <TName extends string>(name: TName) => {
  return (config: ContextSceneConfig) => {
    const wrappedSetup = async (world: UserWorld, sceneContext: SceneContext) => {
      // Initialize context manager
      const contextManager = new ContextManager(name, world);
      
      // Register in scene context for access
      sceneContext.setContextManager(contextManager);
      
      // Default context already exists (id = name)
      
      // Register additional contexts
      if (config.contexts) {
        for (const contextDef of config.contexts) {
          contextManager.registerContext(contextDef);
        }
      }
      
      // Run user setup
      await config.setup(world, contextManager);
    };
    
    // Create underlying scene with scene-level support
    return createScene(name)({
      sceneSetup: wrappedSetup,
      teardown: config.teardown
    });
  };
};
```

**Acceptance:**
- [ ] Creates valid scene
- [ ] Default context registered automatically
- [ ] Additional contexts registered
- [ ] User setup receives context manager

---

### Story 4: Implement Context Hooks

**Files:**
- `packages/plugins/spatial-contexts/src/hooks.ts`

**Steps:**
1. Implement `useContextManager()`
2. Implement `useActiveContext()`
3. Implement `useContextWorld(contextId)`
4. Integrate with engine context system
5. Add error handling

**Implementation:**
```typescript
export function useContextManager(): ContextManager {
  const scene = useScene();
  const contextManager = scene.getContextManager();
  
  if (!contextManager) {
    throw new Error("useContextManager() called outside of context scene");
  }
  
  return contextManager;
}

export function useActiveContext(): string {
  return useContextManager().getActiveContext();
}

export function useContextWorld(contextId: string): World {
  const world = useContextManager().getWorld(contextId);
  
  if (!world) {
    throw new Error(`Context ${contextId} not found or not loaded`);
  }
  
  return new UserWorld(world);
}
```

**Acceptance:**
- [ ] Hooks return correct values
- [ ] Error handling works
- [ ] Type safety maintained

---

### Story 5: Create Portal Component

**Files:**
- `packages/plugins/spatial-contexts/src/components/portal.ts`

**Steps:**
1. Define Portal component class
2. Add properties (target, transition, etc.)
3. Export from components index
4. Add to plugin exports

**Acceptance:**
- [ ] Component is usable
- [ ] Serializable
- [ ] Well-typed

---

### Story 6: Implement Portal Transition System

**Files:**
- `packages/plugins/spatial-contexts/src/systems/portal-transition.ts`

**Steps:**
1. Create system to detect portal triggers
2. Check player collision with portals
3. Handle transition logic
4. Fire transition events
5. Update active context

**Implementation:**
```typescript
export const portalTransitionSystem = createSystem("portalTransition")({
  system() {
    const world = useWorld();
    const contextManager = useContextManager();
    
    // Find player
    const players = world.query(Player, Transform);
    if (players.length === 0) return;
    
    const playerId = players[0];
    const playerTransform = world.get(playerId, Transform)!;
    
    // Check each portal
    for (const portalId of world.query(Portal, Transform)) {
      const portal = world.get(portalId, Portal)!;
      const portalTransform = world.get(portalId, Transform)!;
      
      if (!portal.enabled) continue;
      
      // Check overlap
      if (isOverlapping(playerTransform, portalTransform)) {
        if (portal.requireInteraction && !isInteractionPressed()) {
          continue;
        }
        
        // Trigger transition
        contextManager.transitionTo(portal.targetContext);
        
        // Move player to spawn point in new context
        movePlayerToSpawnPoint(playerId, portal.targetContext);
        
        break; // Only one transition per frame
      }
    }
  }
});
```

**Acceptance:**
- [ ] Detects portal collisions
- [ ] Triggers context transitions
- [ ] Handles player movement
- [ ] Respects interaction requirements

---

### Story 7: Auto-Register Plugin Systems

**Files:**
- `packages/plugins/spatial-contexts/src/create-context-scene.ts` (update)

**Steps:**
1. Add plugin systems to scene config
2. Auto-register portal transition system
3. Auto-register context cleanup system
4. Allow user to disable auto-registration if needed

**Acceptance:**
- [ ] Plugin systems run automatically
- [ ] User can opt out if needed
- [ ] No conflicts with user systems

---

### Story 8: Add Context Streaming Support

**Files:**
- `packages/plugins/spatial-contexts/src/streaming.ts`

**Steps:**
1. Add load/unload methods to ContextManager
2. Implement async context loading
3. Handle asset loading per context
4. Add memory management
5. Add streaming utilities

**Acceptance:**
- [ ] Contexts can be loaded async
- [ ] Unloaded contexts free memory
- [ ] Asset loading integrated

---

### Story 9: Create Example App

**Files:**
- `apps/client/src/scenes/contextDemo.ts`

**Steps:**
1. Create demo scene with 2-3 contexts
2. Add portals between contexts
3. Add composite rendering
4. Add visual indicators
5. Document code thoroughly

**Acceptance:**
- [ ] Demo works end-to-end
- [ ] Shows all major features
- [ ] Code is exemplary

---

### Story 10: Write Tests

**Files:**
- `packages/plugins/spatial-contexts/src/context-manager.spec.ts`
- `packages/plugins/spatial-contexts/src/portal-system.spec.ts`

**Steps:**
1. Test context registration
2. Test world management
3. Test transitions
4. Test portal detection
5. Test parent/child relationships
6. Test error cases

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage > 80%
- [ ] Integration tests included

---

### Story 11: Write Documentation

**Files:**
- `packages/plugins/spatial-contexts/README.md`
- `docs/SPATIAL_CONTEXTS_GUIDE.md`

**Steps:**
1. Document all APIs
2. Add usage guide
3. Add examples for common patterns
4. Document best practices
5. Link architecture docs

**Acceptance:**
- [ ] Complete API reference
- [ ] Clear usage guide
- [ ] Examples are runnable

---

## Implementation Order

1. ✅ Story 1: Package structure
2. ✅ Story 2: ContextManager core
3. ✅ Story 3: Context scene factory
4. ✅ Story 4: Context hooks
5. ✅ Story 5: Portal component
6. ✅ Story 6: Portal transition system
7. ✅ Story 7: Auto-registration
8. ✅ Story 8: Streaming support
9. ✅ Story 9: Example app
10. ✅ Story 10: Tests
11. ✅ Story 11: Documentation

**Estimated Time:** 2 weeks

---

## Dependencies

**Required Before Starting:**
- ✅ Scene-level systems support (Phase 2)
- ✅ Multi-world engine support (Phase 3)
- ✅ Basic rendering (Phase 1)

---

## Testing Strategy

### Unit Tests
- Context manager operations
- Portal detection logic
- Transition mechanics
- Error handling

### Integration Tests
- Full context transitions
- Multi-world rendering
- Portal system end-to-end
- Memory management

### Manual Testing
- Play through demo scene
- Test all transitions
- Verify rendering
- Check performance

---

## Success Criteria

- [ ] Can create scenes with multiple contexts
- [ ] Contexts are isolated simulation spaces
- [ ] Portals trigger transitions correctly
- [ ] Composite rendering works
- [ ] API is intuitive
- [ ] Plugin is well-documented
- [ ] Tests pass with good coverage
- [ ] Demo app is impressive
- [ ] No engine pollution (all plugin code)
