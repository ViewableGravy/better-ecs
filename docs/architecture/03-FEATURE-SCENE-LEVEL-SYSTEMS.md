# Feature: Scene-Level Systems Support

## Part 1: Public API & User Experience

### Overview

This feature enables systems to execute at the **scene level** rather than just at the world level. Scene-level systems can access multiple worlds, manage scene-wide state, and coordinate cross-world operations. This is essential for spatial contexts and other advanced features.

---

### User-Facing API

#### Defining Scene-Level Systems

```typescript
import { createSystem } from "@repo/engine/core";

// Regular world-level system (existing)
const worldSystem = createSystem("worldSystem")({
  phase: "update",
  system() {
    const world = useWorld(); // Accesses active world
    // Operates on single world
  },
});

// NEW: Scene-level system (uses scene hook)
const sceneSystem = createSystem("sceneSystem")({
  phase: "update",
  system() {
    const scene = useScene(); // NEW: Access scene instead of world
    // Operates at scene level
  },
});

// Scene configuration accepts systems
const gameScene = createScene("game")({
  systems: [sceneSystem], // NEW: Scene-specific systems
  setup(world) {
    // World setup
  },
});
```

---

#### Scene Context Hooks

```typescript
import { useScene } from "@repo/engine/core";

const sceneTransitionSystem = createSystem("sceneTransition")({
  system() {
    const scene = useScene();

    // Access scene metadata
    console.log(scene.name); // "menu" | "game" | etc.

    // Access default world (legacy implicit API; migrate to explicit world IDs)
    const defaultWorld = scene.getDefaultWorld();

    // Access multiple worlds (for contexts)
    const worlds = scene.getAllWorlds(); // Map<string, World>
    const world = scene.getWorld("overworld"); // Get specific world

    // Scene-level operations
    scene.loadAdditionalWorld("house_1");
    scene.unloadWorld("cave_entrance");
  },
});
```

---

### User Experience Examples

#### Example 1: Context Manager System

```typescript
// A scene-level system managing spatial contexts
const contextManagerSystem = createSystem("contextManager")({
  system() {
    const scene = useScene();
    const activeContextId = getActiveContextFromState();

    // Get active world
    const activeWorld = scene.getWorld(activeContextId);

    // Check for player transition triggers
    for (const portalId of activeWorld.query(Portal)) {
      const portal = activeWorld.get(portalId, Portal)!;

      if (playerTriggeredPortal(portal)) {
        // Load target world if not loaded
        if (!scene.hasWorld(portal.target)) {
          scene.loadAdditionalWorld(portal.target);
        }

        // Transition player between worlds
        transitionPlayerToContext(portal.target);
      }
    }
  },
});
```

#### Example 2: Scene-Wide Asset Streaming

```typescript
const assetStreamingSystem = createSystem("assetStreaming")({
  system() {
    const scene = useScene();
    const playerPosition = getPlayerPosition();

    // Get all worlds in scene
    for (const [contextId, world] of scene.getAllWorlds()) {
      const distance = calculateDistanceToContext(playerPosition, contextId);

      // Stream in nearby contexts
      if (distance < STREAM_IN_DISTANCE && !isContextLoaded(contextId)) {
        loadContextAssets(contextId);
      }

      // Stream out far contexts
      if (distance > STREAM_OUT_DISTANCE && isContextLoaded(contextId)) {
        unloadContextAssets(contextId);
      }
    }
  },
});
```

#### Example 3: Multi-World Physics Sync (If Needed)

```typescript
const physicsCoordinatorSystem = createSystem("physicsCoordinator")({
  system() {
    const scene = useScene();

    // This system could coordinate special physics interactions
    // across context boundaries (portals, falling objects, etc.)

    for (const [contextId, world] of scene.getAllWorlds()) {
      // Check for cross-context physics events
      handleCrossContextPhysics(world, contextId);
    }
  },
});
```

---

### No Legacy Code Policy

This project follows a strict No Legacy Code Policy: legacy implicit behaviors and compatibility shims are removed rather than preserved. New APIs must be adopted by userland code and migration tooling (codemods, guides) should be provided to update existing code.

Guidance:

- Prefer scene-specific systems for logic that only applies to certain scenes via the `systems` array in `createScene`.
- Provide automated migration tools to update existing systems to the new API surface.
- Remove legacy implicit behaviors (such as implicit default-world assumptions) as part of the rollout.

---

## Part 2: Internal Implementation Steps

### Story 1: Extend Scene Definition Types

**Files:**

- `packages/engine/src/core/scene/scene.types.ts`

**Steps:**

1. Add `systems?: SystemFactoryTuple` to `SceneConfig`
2. Update `createScene` to accept and store these systems
3. Ensure types are merged with engine systems in `Register` interface
4. Update type inference for `useScene()` to be aware of the context

**Acceptance:**

- [ ] Scenes can declare a list of systems
- [ ] Type inference works correctly
- [ ] Systems passed to scenes are correctly isolated from global systems

---

### Story 2: Create Scene Context API

**Files:**

- `packages/engine/src/core/scene/scene-context.ts`
- `packages/engine/src/core/scene/scene.types.ts`

**Steps:**

1. Create `SceneContext` class
2. Implement world registry (Map<string, World>)
3. Add `getDefaultWorld()` method
4. Add `getWorld(id)` method
5. Add `getAllWorlds()` method
6. Add `hasWorld(id)` method
7. Store scene metadata (name, etc.)

**Implementation:**

```typescript
export class SceneContext {
  private worlds = new Map<string, World>();
  private defaultWorldId: string;
  public name: string;

  constructor(name: string, defaultWorld: World) {
    this.name = name;
    this.defaultWorldId = "default";
    this.worlds.set(this.defaultWorldId, defaultWorld);
  }

  getDefaultWorld(): World {
    return this.worlds.get(this.defaultWorldId)!;
  }

  getWorld(id: string): World | undefined {
    return this.worlds.get(id);
  }

  getAllWorlds(): Map<string, World> {
    return this.worlds;
  }

  hasWorld(id: string): boolean {
    return this.worlds.has(id);
  }

  registerWorld(id: string, world: World): void {
    this.worlds.set(id, world);
  }

  unregisterWorld(id: string): void {
    if (id === this.defaultWorldId) {
      throw new Error("Cannot unregister default world");
    }
    this.worlds.delete(id);
  }
}
```

**Acceptance:**

- [ ] SceneContext manages multiple worlds
- [ ] API is type-safe
- [ ] Default world behavior preserved

---

### Story 3: Create Scene Context Hook

**Files:**

- `packages/engine/src/core/context.ts`

**Steps:**

1. Add scene context to engine context
2. Implement `useScene()` hook
3. Add context validation

**Implementation:**

```typescript
export function useScene(): SceneContext {
  const context = getEngineContext();

  if (!context.scene) {
    throw new Error("useScene() called outside of scene context (no active scene)");
  }

  return context.scene;
}
```

**Acceptance:**

- [ ] Hook returns scene context
- [ ] Errors on misuse
- [ ] Clear error messages

---

### Story 4: Update Engine Loop for Scene Systems

**Files:**

- `packages/engine/src/core/engine.ts`
- `packages/engine/src/core/utils/start.ts`

**Steps:**

1. Identify engine-level global systems and active scene systems
2. Run scene systems after engine systems (or in defined order)
3. Set appropriate context before system execution
4. Handle both update and render phases

**Implementation Flow:**

```typescript
// In engine loop
async function runUpdatePhase() {
  const currentScene = sceneManager.getActiveScene();

  // 1. Run engine-level global systems
  for (const system of engineSystems) {
    setEngineContext({ world: defaultWorld, scene: currentScene });
    system.system();
  }

  // 2. Run scene-specific systems
  if (currentScene) {
    for (const system of currentScene.systems) {
      setEngineContext({ world: defaultWorld, scene: currentScene });
      system.system();
    }
  }
}
```

**Acceptance:**

- [ ] Scene systems run after engine systems
- [ ] Context is set correctly for each system
- [ ] Both phases (update/render) supported
- [ ] No performance regression

---

### Story 5: Update SceneManager Integration

**Files:**

- `packages/engine/src/core/scene/scene-manager.ts`

**Steps:**

1. Create `SceneContext` on scene load
2. Store scene context in SceneManager
3. Provide access to scene context
4. Handle scene transitions (cleanup scene context)

**Acceptance:**

- [ ] Scene context created on load
- [ ] Scene context cleaned on transition
- [ ] No memory leaks

---

### Story 6: Add Scene Lifecycle Hooks

**Files:**

- `packages/engine/src/core/scene/scene.types.ts`
- `packages/engine/src/core/scene/scene.ts`

**Steps:**

1. Add optional `sceneSetup()` to scene config
2. Add optional `sceneTeardown()` to scene config
3. Call these during scene lifecycle
4. Pass SceneContext to hooks

**API:**

```typescript
const MyScene = createScene("myScene")({
  // NEW: Scene-specific systems
  systems: [physicsSyncSystem, aiSystem],

  // World setup (existing)
  setup(world) {
    // Setup default world
  },

  // NEW: Scene setup (optional)
  sceneSetup(sceneContext) {
    // Setup scene-level state
    // Register additional worlds, etc.
  },

  teardown(world) {
    // Existing world teardown
  },

  // NEW: Scene teardown (optional)
  sceneTeardown(sceneContext) {
    // Cleanup scene-level state
  },
});
```

**Acceptance:**

- [ ] Scene hooks called at correct times
- [ ] Migration tooling available for hooks; remove implicit hook behavior
- [ ] Clear distinction from world hooks

---

### Story 7: Update Existing World Hook

**Files:**

- `packages/engine/src/core/context.ts`

**Steps:**

1. Ensure `useWorld()` works in both global and scene systems
2. Update documentation to reflect that `useWorld()` always operates on the currently active world within the engine context.

**Acceptance:**

- [ ] `useWorld()` works as before for global systems
- [ ] `useWorld()` works within scene systems if a world is active
- [ ] Documentation updated

---

### Story 8: Create Scene System Examples

**Files:**

- `apps/client/src/systems/examples/sceneSystemExample.ts`
- `packages/engine/src/tests/scene/scene-systems.spec.ts`

**Steps:**

1. Create example scene-level system
2. Demonstrate world access patterns
3. Show scene metadata usage
4. Add to example app

**Acceptance:**

- [ ] Example runs successfully
- [ ] Code is clear and documented
- [ ] Serves as template for users

---

### Story 9: Write Tests

**Files:**

- `packages/engine/src/tests/scene/scene-context.spec.ts`
- `packages/engine/src/tests/systems/scene-systems.spec.ts`

**Steps:**

1. Test scene context creation
2. Test world registration/unregistration
3. Test scene hook calls
4. Test world hook calls (ensure no regression)
5. Test system execution order
6. Test context isolation

**Acceptance:**

- [ ] All tests pass
- [ ] Coverage > 80%
- [ ] Edge cases covered

---

### Story 10: Update Documentation

**Files:**

- `docs/SCENE_SYSTEMS.md` (new)
- `packages/engine/README.md` (update)

**Steps:**

1. Document scene vs world systems
2. Explain when to use each
3. Document all scene context methods
4. Add migration guide for complex systems
5. Link to architecture docs

**Acceptance:**

- [ ] Clear explanation of concepts
- [ ] Examples for common patterns
- [ ] Easy to understand for new users

---

## Implementation Order

1. ✅ Story 1: Type definitions
2. ✅ Story 2: Scene context API
3. ✅ Story 3: useScene hook
4. ✅ Story 7: Update useWorld (ensure compatibility)
5. ✅ Story 4: Engine loop updates
6. ✅ Story 5: SceneManager integration
7. ✅ Story 6: Scene lifecycle hooks
8. ✅ Story 8: Examples
9. ✅ Story 9: Tests
10. ✅ Story 10: Documentation

**Estimated Time:** 1 week

---

## Testing Strategy

### Unit Tests

- Scene context world management
- Hook error handling
- System isolation validation

### Integration Tests

- Scene system execution
- World system execution (no regression)
- System execution order
- Context switching

### End-to-End Tests

- Complete scene with both system types
- Scene transitions with cleanup

---

## Success Criteria

- [ ] Scene-level systems can be defined
- [ ] `useScene()` hook works correctly
- [ ] Scene context provides world access
- [ ] World systems updated and migrated; no implicit assumptions remain
- [ ] System execution order is correct
- [ ] Documentation is clear
- [ ] Tests pass with good coverage
- [ ] Example demonstrates feature
