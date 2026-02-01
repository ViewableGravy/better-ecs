# Spatial Contexts Architecture

## Executive Summary

This document defines the architectural foundation for **spatial contexts** in the Better ECS engine. Spatial contexts enable complex world organization through **dedicated World instances** acting as simulation boundaries, orchestrated by a plugin-based system.

### Core Principle

**A context equals a dedicated World instance.**

Contexts are simulation boundaries, not filters or tags. The engine remains unaware of contexts—all context logic lives in a plugin that orchestrates multiple worlds within a scene.

---

## Table of Contents

1. [Core Mental Model](#core-mental-model)
2. [Architecture Boundaries](#architecture-boundaries)
3. [Physics Integration](#physics-integration)
4. [Rendering Model](#rendering-model)
5. [Persistence](#persistence)
6. [Access Patterns](#access-patterns)
7. [Visual Editor](#visual-editor)
8. [Key Architectural Decisions](#key-architectural-decisions)
9. [Implementation Strategy](#implementation-strategy)

---

## Core Mental Model

### World as Context

```
Scene
 ├── World("overworld")      // Parent context
 ├── World("house_1")        // Child context
 └── World("cave_entrance")  // Child context
```

Each context is a complete, independent World instance with:
- Its own entity set
- Its own component stores
- Its own physics space
- Its own simulation state

### Consequences

**Isolation by Default:**
- Physics runs per-world with no cross-context queries
- Gameplay systems operate only on the active world
- Entities in different contexts never interact unless explicitly orchestrated

**Composition for Rendering:**
- Rendering may composite multiple worlds (parent + active)
- Visual layering is a rendering concern, not a simulation concern

**Plugin Orchestration:**
- A plugin manages world lifecycle, transitions, and composition
- The engine provides only multi-world support primitives

---

## Architecture Boundaries

### Engine Layer (Minimal, Generic)

**Responsibilities:**
- ECS primitives (Entity, Component, World)
- Multiple World support per scene
- GPU abstractions (WebGL/WebGPU)
- Core asset types (Texture, Mesh)
- Camera primitives
- Batching helpers

**Does NOT provide:**
- Context definitions or logic
- Cross-context coordination
- Rendering behavior or policies
- Context-specific features

### Plugin Layer (Complexity Lives Here)

**Package:** `@repo/plugins/spatial-contexts`

**Responsibilities:**
- Context definitions and registry
- World lifecycle management
- Transition orchestration
- Context-aware access helpers
- Serialization strategies
- Editor integration APIs

**Provides:**
- `useActiveContext()` - ID of the currently focused context (e.g. for input/rendering policy)
- `useContextWorld(id)` - Access specific world
- `useContextManager()` - Plugin orchestration API

### User/Game Layer (Defines Behavior)

**Responsibilities:**
- Render systems (what to draw, how to composite)
- Gameplay systems (movement, combat, AI)
- Game-specific components
- Visual effects and post-processing
- Asset selection and configuration

**Key Principle:**
User systems call `useWorld()` and remain context-unaware unless they explicitly need context features.

---

## Physics Integration

### Principle: Native Physics Remains Unchanged

Each world owns its own physics space. Physics systems have no knowledge of contexts.

**Implications:**
- Objects inside a house never collide with overworld entities
- Bullets, triggers, and AI operate only within their world
- Cross-context interaction is always opt-in through plugin logic

**Portal Example:**
```typescript
// Portals are plugin-managed, not physics-managed
const portalSystem = createSystem("portal")({
  system() {
    const world = useWorld();
    const contextManager = useContextManager();
    
    for (const portalId of world.query(Portal, Transform)) {
      const portal = world.get(portalId, Portal)!;
      const transform = world.get(portalId, Transform)!;
      
      // Check for player overlap (within same world)
      const player = findPlayerInRange(transform.position);
      
      if (player && isOverlapping(player, transform)) {
        // Transition to target context
        contextManager.transitionTo(portal.targetContext);
      }
    }
  }
});
```

No physics system needs to know about contexts. Portals are gameplay features implemented in user code.

---

## Rendering Model

### Engine Provides Graphics Primitives Only

**Graphics API (Engine):**
- WebGL / WebGPU abstraction
- Texture and mesh management
- Camera transforms
- Batching helpers
- Shader compilation
 - Rendering primitives and higher-level draw helpers (exported from `@repo/engine/render`, not directly from `@repo/engine`)

**No Rendering Policy in Engine:**
The engine does NOT decide:
- What components mean "visible"
- Draw order or layering
- Post-effects or composition
- Context blending

### User Defines Rendering Behavior

**Composite Rendering Pattern:**

```typescript
const renderSystem = createSystem("render")({
  system() {
    const contextManager = useContextManager();
    const activeContext = contextManager.getActiveContext();
    const parentContext = contextManager.getParent(activeContext);
    
    // Clear canvas
    clearScreen();
    
    // Draw parent context as backdrop (optional)
    if (parentContext) {
      const parentWorld = contextManager.getWorld(parentContext);
      drawWorld(parentWorld, { opacity: 0.3, filter: "blur(2px)" });
    }
    
    // Draw active context (full opacity)
    const activeWorld = contextManager.getWorld(activeContext);
    drawWorld(activeWorld, { opacity: 1.0 });
  }
});
```

**Key Insight:**
Gameplay uses active world only. Rendering may read multiple worlds for composition. This separation is critical.

---

## Persistence

### Storage Shape

```json
{
  "context": "house_1",
  "parent": "overworld",
  "entities": [
    {
      "type": "chair",
      "components": {
        "Transform": { "x": 2, "y": 3, "rotation": 0 },
        "Sprite": { "texture": "chair.png" }
      }
    }
  ]
}
```

### Loading Flow

1. Enter context (user triggers transition)
2. Plugin creates target world
3. Plugin deserializes entities into that world
4. Plugin sets context as active

### Placement Flow (Editor)

1. Determine active context
2. Validate position/rules against that world
3. Create entity in that world
4. Serialize to context-specific file

**Important:** Objects belong to exactly one context. No entity exists in multiple worlds simultaneously.

---

## Access Patterns

### Plugin-Provided Helpers

```typescript
// Get currently active context ID
const activeContextId = useActiveContext();

// Access a specific world by context ID
const world = useContextWorld("house_1");

// Access the context manager for advanced operations
const contextManager = useContextManager();
```

### Context Resolution

Because `Context === World`, context resolution is implicit:

1.  **By Entity Reference:** If you hold an entity ID and its World (e.g. within a system), the World *is* the context.
2.  **By Transform (Single World):** Within a world, spatial queries (Triggers/Portals) determine if an entity should *transition* to another context.
3.  **By Transform (Cross World):** Because worlds are disjoint simulation boundaries (Coordinate `0,0` exists in both Overworld and House), you cannot resolve a generic Transform to a Context without knowing which world that transform belongs to.

**Recommendation:**
Avoid global utility functions like `getContext(transform)`. Instead, logical transitions (like entering a house) should be handled by gameplay systems detecting triggers in the *current* world and commanding the `ContextManager` to switch the active context ID.

### Standard World Access (Context-Agnostic)

```typescript
// User systems remain context-unaware
const mySystem = createSystem("mySystem")({
  system() {
    const world = useWorld(); // Always returns active world
    
    // Standard ECS operations
    for (const id of world.query(Position, Velocity)) {
      // ...
    }
  }
});
```

**Design Goal:** Most game systems never need to know about contexts.

---

## Visual Editor

### Editor Behavior

**Context Selection:**
- Shows list of all contexts in scene
- User selects active context for editing
- Parent context displayed as read-only backdrop

**Entity Creation:**
- New entities created in active context only
- Cannot create entities in parent from child view

**Portal Creation:**
- Portals created in parent context
- Portal targets point to child contexts
- Visual indicators show portal destinations

### Authoring Rules

1. **One Context Per Entity:** Objects belong to exactly one world
2. **Parent Portals:** Portals created in parent, not child
3. **Scoped Editing:** All editor operations scoped to active context
4. **Serialization:** Save per-context, not monolithic scene file

---

## Key Architectural Decisions

### Decision 1: Contexts Are World Boundaries, Not Tags

**Rejected Alternatives:**
- ❌ Context as a component/tag on entities
- ❌ Context as a query filter
- ❌ Single world with context-aware systems

**Chosen Approach:**
✅ Each context is a dedicated World instance

**Rationale:**
- Clear simulation boundaries
- Physics naturally isolated
- No special-case logic in systems
- Simpler serialization

### Decision 2: Native Physics Unchanged

**Rejected Alternatives:**
- ❌ Add context filters to physics systems
- ❌ Global physics space with layer masks
- ❌ Special collision rules for contexts

**Chosen Approach:**
✅ Each world has its own physics space

**Rationale:**
- Zero engine modifications for physics
- No performance overhead
- Predictable behavior
- Easier debugging

### Decision 3: Rendering is User-Defined

**Rejected Alternatives:**
- ❌ Engine defines context rendering rules
- ❌ Auto-composite parent contexts
- ❌ Built-in z-order for contexts

**Chosen Approach:**
✅ Game code defines all rendering behavior

**Rationale:**
- Maximum flexibility
- Games may not want parent rendering
- Different visual styles per game
- Engine stays minimal

### Decision 4: Plugin-Based Implementation

**Rejected Alternatives:**
- ❌ Build contexts into engine core
- ❌ Make contexts a first-class engine feature

**Chosen Approach:**
✅ Contexts as a standalone plugin

**Rationale:**
- Zero cost for games not using contexts
- Easier to iterate on design
- Clean separation of concerns
- Other plugins can use same patterns

---

## Implementation Strategy

### Phase 1: Engine Foundations
- Multi-world support in SceneManager
- Generic GPU abstraction layer
- Camera primitives

### Phase 2: Plugin Core
- Context manager implementation
- World lifecycle orchestration
- Access helper hooks

### Phase 3: Context Features
- Transition system
- Serialization/deserialization
- Prefetching/streaming

### Phase 4: Editor Integration
- Context selector UI
- Scoped entity creation
- Portal authoring tools

See [01-IMPLEMENTATION-ROADMAP.md](./01-IMPLEMENTATION-ROADMAP.md) for detailed breakdown.

---

## Next Steps

1. **Review rendering concepts:** [05-RENDERING-CONCEPTS.md](./05-RENDERING-CONCEPTS.md)
2. **Understand feature APIs:** Individual feature docs in this folder
3. **Read concerns document:** [09-CONCERNS-AND-CONSIDERATIONS.md](./09-CONCERNS-AND-CONSIDERATIONS.md)
4. **Begin implementation:** Follow roadmap in priority order

---

## Conclusion

Spatial contexts provide powerful world organization through a simple principle: **context = world**. By keeping the engine minimal and pushing complexity into a plugin, we maintain the engine's flexibility while enabling sophisticated multi-world scenarios.

The architecture ensures:
- ✅ Clean separation of concerns
- ✅ Zero cost when unused
- ✅ Framework-agnostic core
- ✅ Plugin-driven complexity
- ✅ User-defined behavior

This document serves as the canonical reference for all spatial context implementation work.
