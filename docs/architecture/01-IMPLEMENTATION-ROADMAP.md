# Implementation Roadmap: Spatial Contexts

## Overview

This document provides a **high-level, step-by-step roadmap** for implementing the spatial contexts architecture. Each major feature is broken down into ordered tasks with dependencies clearly marked.

---

## Implementation Phases

### Phase 1: Rendering Foundations (PREREQUISITE)

**Goal:** Establish minimal graphics API before context work begins.

#### Tasks
1. **Define rendering primitives**
   - Research patterns from Unity, Godot, Three.js, Bevy (captured in implemented engine rendering APIs)
   - Define core types: Transform, Camera, Mesh, Texture, Sprite
   - Create component definitions

2. **Implement GPU abstraction layer**
   - WebGL renderer base
   - WebGPU renderer base (future)
   - Renderer interface/protocol
   - Batch submission API

3. **Implement camera system**
   - Camera component
   - View matrix calculation
   - Projection matrix calculation
   - Camera controller utilities

4. **Implement basic sprite rendering**
   - Sprite component
   - Texture loading
   - Sprite batch rendering
   - Transform integration

**Dependencies:** None
**Deliverable:** Working sprite rendering in client app
**Estimated Effort:** 2-3 weeks

**Note:** A new scene should be implemented to support testing this out, to avoid leaking into the existing application. A simple button to switch scenes may
be necessary for playing around with this.

---

### Phase 2: World Partitioning & Entity Streaming (EXPLORATION)

**Goal:** Investigate and design entity streaming system for open-world gameplay.

**Note:** This is a **discussion and exploration phase**. Recreate focused notes only if/when open-world streaming is prioritized again.

#### Tasks
1. **Architectural investigation**
   - Compare engine core vs plugin approaches
   - Evaluate component-based vs abstraction-based design
   - Performance spike on 100k+ entity scenarios

2. **Design decisions**
   - Partition algorithm (grid, quadtree, octree)
   - Storage format (JSON, binary, database)
   - Streaming triggers (distance, hysteresis, predictive)
   - World type hierarchy

3. **Proof-of-concept**
   - Implement leading approaches
   - Benchmark performance
   - Document trade-offs

**Dependencies:** Phase 1 (rendering)
**Deliverable:** Architecture decision document + recommendation
**Estimated Effort:** 1 week (exploration)

---

### Phase 3: Scene-Level Systems Support

**Goal:** Enable systems to run at scene level, not just per-world.

#### Tasks
1. **Add scene-level system phase**
   - Extend system definition to support scene-level execution
   - Update engine loop to run scene systems
   - Follow the No Legacy Code Policy: update the client application to use modern features and remove legacy code

2. **Implement scene context injection**
   - `useScene()` hook for systems
   - Access to scene metadata
   - Access to multiple worlds

3. **Create scene system examples**
   - Scene transition system
   - Scene loading system
   - Asset management system

**Dependencies:** Phase 1 (rendering)
**Deliverable:** Scene-level systems running alongside world systems
**Estimated Effort:** 1 week

---

### Phase 4: Entity Streaming Implementation (POST-EXPLORATION)

**Goal:** Implement the chosen world partitioning and entity streaming system.

#### Tasks
1. **Implement partitioning abstraction** (based on Phase 2 decision)
   - Partition provider interface
   - Spatial indexing algorithm
   - Nearby query helpers

2. **Implement serialization/deserialization**
   - Component serialization hooks
   - Partition save format
   - Partition load pipeline

3. **Implement streaming lifecycle**
   - Stream-in system (create entities from storage)
   - Stream-out system (save + destroy entities)
   - Streaming event notifications

4. **Create storage provider**
   - File system backend
   - Partition I/O helpers
   - Async loading

5. **Build demo open-world scene**
   - Demonstrate streaming in action
   - Performance profiling
   - Example streaming system

**Dependencies:** Phase 2 (architectural decision)
**Deliverable:** Working entity streaming in demo scene with 1M+ entities
**Estimated Effort:** 1-2 weeks

**Note:**: The engine already has a system for serializing components, so we simply need a mechanism for iterating through an entity and serializing the entityId and all it's components together, this would presumably be something like:
```typescript
for (const entityId in notInPlayerRange()) {
   serializeEntity(entityId);
   destroy(entityId);
}
```

where `serializeEntity(id: EntityId)` is something like:
```ts
const serialized = {
   id: entityId,
   components: []
}
for (component in getComponents(entityId)) {
   if (component instanceof Serializable)
      serialized.components.push(component.toJSON())
}
```

---

### Phase 5: Streaming Optimizations (OPTIONAL)

**Goal:** Performance polish for production open-world games.

#### Tasks
1. **Async I/O optimization**
   - Non-blocking partition loads
   - Streaming queue with priority
   - Background thread/worker support

2. **Predictive streaming**
   - Player velocity-based pre-loading
   - Smooth streaming with no frame drops
   - Memory budgeting

3. **Memory pooling**
   - Entity object pool
   - Component data reuse
   - Garbage collection tuning

**Dependencies:** Phase 4 (streaming)
**Deliverable:** Optimized streaming with smooth frame pacing
**Estimated Effort:** 1 week (optional)

---

### Phase 6: Multi-World Engine Support

**Goal:** Enable scenes to manage multiple World instances.

#### Tasks
1. **Extend SceneManager for multi-world**
   - Add world registry per scene
   - Implement `scene.getWorld(id)` accessor
   - Migrate implicit default-world usage: remove legacy implicit default-world behavior and update callers to use explicit world IDs

2. **Update scene lifecycle**
   - World creation hooks
   - World cleanup on scene transition
   - Memory management for inactive worlds

3. **Add world identification**
   - Optional world IDs/names
   - World metadata storage
   - Debug/logging improvements

**Dependencies:** Phase 3 (scene systems)
**Deliverable:** Scenes can create and manage multiple worlds
**Estimated Effort:** 1 week

---

### Phase 7: Context Scene Plugin Core

**Goal:** Implement the spatial contexts plugin package.

#### Tasks
1. **Create plugin package structure**
   - `packages/plugins/spatial-contexts/`
   - Package setup (tsconfig, exports)
   - Test infrastructure

2. **Implement ContextManager**
   - Context registry
   - World lifecycle management
   - Active context tracking
   - Parent/child relationships

3. **Create context scene factory**
   - `createContextScene()` wrapper
   - Auto-registration of default context
   - Context definition API
   - Scene config integration

4. **Implement access hooks**
   - `useActiveContext()`
   - `useContextWorld(id)`
   - `useContextManager()`
   - Hook integration with engine context system

**Dependencies:** Phase 3 (multi-world support)
**Deliverable:** Working context plugin with basic API
**Estimated Effort:** 2 weeks

---

### Phase 8: Context Transitions

**Goal:** Enable gameplay transitions between contexts.

#### Tasks
1. **Define transition API**
   - Transition triggers (manual, portal, volume)
   - Transition animation hooks
   - Transition validation

2. **Implement ContextTransitionSystem**
   - Detect transition triggers
   - Execute context switches
   - Update active context
   - Fire transition events

3. **Create Portal component**
   - Portal definition (target, position, size)
   - Portal collision detection
   - Portal rendering hints

4. **Add transition loading**
   - Async context loading during transition
   - Loading screens/progress
   - Error handling

**Dependencies:** Phase 4 (plugin core)
**Deliverable:** Player can transition between contexts via portals
**Estimated Effort:** 1-2 weeks

---

### Phase 9: Context Rendering System

**Goal:** Enable composite rendering of multiple contexts.

#### Tasks
1. **Implement composite render system**
   - Multi-world rendering
   - Parent context backdrop
   - Opacity/filter controls

2. **Add rendering utilities**
   - Per-context camera management
   - Viewport/scissor management
   - Z-order configuration

3. **Create example composite renderers**
   - Parent + active composite
   - Multi-context viewport splits
   - Portal preview rendering

**Dependencies:** Phase 5 (transitions)
**Deliverable:** Visual composition of parent + child contexts
**Estimated Effort:** 1-2 weeks

---

### Phase 10: Persistence System

**Goal:** Save and load per-context world state.

#### Tasks
1. **Define serialization format**
   - Per-context JSON schema
   - Entity serialization rules
   - Component serialization hooks

2. **Implement context serialization**
   - Serialize world to context file
   - Include context metadata
   - Handle entity references

3. **Implement context deserialization**
   - Load context from file
   - Reconstruct entities
   - Restore component state

4. **Add async streaming**
   - Proximity-based loading
   - Unload distant contexts
   - Memory management

**Dependencies:** Phase 6 (rendering)
**Deliverable:** Contexts can be saved/loaded from disk
**Estimated Effort:** 2 weeks

---

### Phase 11: Visual Editor Support

**Goal:** Enable spatial contexts in the visual editor.

#### Tasks
1. **Design editor architecture**
   - Editor as separate system/app
   - Communication protocol with engine
   - State synchronization

2. **Implement context selector UI**
   - List all contexts
   - Switch active context
   - Show parent as backdrop

3. **Add entity creation scoping**
   - Create entities in active context only
   - Prevent edits to parent
   - Visual indicators for context boundaries

4. **Implement portal authoring**
   - Portal placement tool
   - Target context selection
   - Portal preview/testing

5. **Add context management**
   - Create new contexts
   - Delete contexts
   - Set parent/child relationships

**Dependencies:** Phase 10 (persistence)
**Deliverable:** Full editor support for authoring spatial contexts
**Estimated Effort:** 3-4 weeks

---

## Summary Timeline

| Phase | Feature | Effort | Dependencies |
|-------|---------|--------|--------------|
| 1 | Rendering Foundations | 2-3 weeks | None |
| 2 | World Partitioning (Discussion) | 1 week | Phase 1 |
| 3 | Entity Streaming | 1-2 weeks | Phase 2 |
| 4 | Streaming Optimizations | 1 week | Phase 3 |
| 5 | Scene-Level Systems | 1 week | Phase 1 |
| 6 | Multi-World Support | 1 week | Phase 5 |
| 7 | Plugin Core | 2 weeks | Phase 6 |
| 8 | Transitions | 1-2 weeks | Phase 7 |
| 9 | Context Rendering | 1-2 weeks | Phase 8 |
| 10 | Persistence | 2 weeks | Phase 9 |
| 11 | Visual Editor | 3-4 weeks | Phase 10 |

**Total Estimated Time:** 17-22 weeks (4-5.5 months)

---

## Iterative Development Strategy

### Milestone 1: Rendering + Open-World Streaming (Phases 1-4)
- ✅ Rendering works
- ✅ Entity streaming works (1M+ entities)
- ✅ Player can move through open world
- **Demo:** Open-world scene with streaming entities

### Milestone 2: Scene-Level & Basic Contexts (Phases 5-7)
- ✅ Scene-level systems work
- ✅ Multiple worlds exist
- ✅ Plugin orchestrates contexts
- ✅ Basic API available
- **Demo:** Static house + overworld contexts

### Milestone 3: Interactive Contexts (Phases 8-9)
- ✅ Portal transitions work
- ✅ Composite rendering works
### Milestone 3: Production Ready (Phases 10-11)
- ✅ Persistence works
- ✅ Editor fully functional
- **Demo:** Complete game with multiple contexts, editor authoring

---

## Parallel Workstreams

Some tasks can be parallelized:

**Rendering + Plugin Core:**
- Rendering foundations (Phase 1) can proceed independently
- Plugin core (Phase 4) can start once multi-world (Phase 3) is ready
- No direct dependency

**Persistence + Editor:**
- Persistence implementation (Phase 7) can overlap with editor UI work
- Editor infrastructure can be developed before full persistence

---

## Risk Mitigation

### Risk 1: Rendering Complexity
**Mitigation:** Start with simplest possible sprite rendering. Expand incrementally.

### Risk 2: Performance Issues
**Mitigation:** Profile at each phase. Implement world streaming early if needed.

### Risk 3: Editor Scope Creep
**Mitigation:** Define MVP editor features. Advanced features can be post-MVP.

---

## Next Steps

1. Read feature-specific documents in this folder
2. Begin Phase 1: Rendering Foundations
3. Create working branch and track progress
4. Review concerns document before each phase

See individual feature documents for detailed API and implementation steps.
