# System Scopes

## 1. System Scopes: World, Scene, and Global

To properly organize partitioned logic, we distinguish between three scopes of systems. This distinction ensures that `PartitionManager` runs in the correct context without user error.

Reference: [03-FEATURE-SCENE-LEVEL-SYSTEMS.md](../03-FEATURE-SCENE-LEVEL-SYSTEMS.md)

### A. Global Systems (Existing)
- **Scope**: Entire Engine lifetime.
- **Role**: Input, Audio, Time, Rendering Pipeline.
- **Registration**: explicit via `createEngine({ systems: [...] })`.

### B. Scene Systems (Planned)
- **Scope**: Active Scene only.
- **Role**: Orchestrates multiple worlds, Scene UI, Gameplay state.
- **Registration**: explicit via `createScene({ systems: [...] })`.
- **Target**: Operates on `useScene()`, affecting all active contexts.

### C. World Systems (New Proposal)
- **Scope**: Specific `World` Instance only.
- **Role**: Logic that is intrinsic to that specific simulation boundary (e.g., A `PartitionManager` for *this* world, Physics for *this* world).
- **Registration**: via `createContextScene` (implicitly) or `World` configuration.

## The "World Systems" Pattern

When a `PartitionWorld` (or Context) is created, it should automatically attach systems that manage its internal state (like streaming).

```typescript
// Conceptual API
const forestContext = createContextScene("forest")({
  worldFactory(args) {
    // ParitionWorld defines some systems that it always requires internally, preventing the need for us to pass the necessary systems, but allowing us to 
    // pass more if necessary.
    return new PartitionWorld(...config)
  }
  // contextScene is an abstraction on `createScene` and injects some scenes automatically always
});
```

## Implementation Goal

The Engine loop must iterate:
1.  Run **Global Systems**.
2.  Run **Scene Systems**.
3.  For each active `World`:
    - Run **World Systems** (bound to that world).

This solves the "injection" problem: The Context Factory (Plugin) automatically attaching the `PartitionManager` as a **World System**. The user never sees it, and it never leaks to other worlds.
