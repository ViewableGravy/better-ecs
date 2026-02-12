---
name: engine
description: Architectural patterns, APIs, and conventions for working with the @repo/engine package.
---

# Better ECS Engine Skill

This skill provides the architectural guidelines and API references for working with the core `@repo/engine` package in the Better ECS workspace.

## When to Use This Skill
You should use this skill when:
*   Creating new systems or game logic in applications or packages.
*   Modifying existing core systems, game loops, or entity behaviors.
*   Querying entities, components, or resources within a system.
*   Setting up or augmenting the engine type definitions in an application.
*   Accessing engine context hooks (`useWorld`, `useSystem`, `useDelta`).
*   Debugging issues related to system scheduling, phase execution, or component state.

## What This Skill Does
*   **Enforces Type Safety**: Explains how to use module augmentation to ensure `Register` types are propagating correctly.
*   **Standardizes System Design**: Provides the canonical layout for defining systems using `createSystem`.
*   **Documents Context API**: Lists available hooks for accessing the world, other systems, and time deltas.
*   **Guides World Interaction**: Shows how to query and modify component state.

## Instructions

### 1. Ensure Type Safety
Userland applications **must** augment the global `Register` interface to inject their specific engine configuration. This enables type inference for `useSystem`, `useWorld`, and other hooks throughout the application.

```typescript
// In apps/client/src/main.ts or a .d.ts file
declare module "@repo/engine" {
  interface Register {
    Engine: Awaited<ReturnType<typeof main>>;
  }
}
```

**Package Access**:
*   Core modules: `import { ... } from "@repo/engine"`
*   Components: `import { ... } from "@repo/engine/components"`

### 2. Define Systems with Standard Layout
Systems are the logic units of the engine. Use the `createSystem` factory.

```typescript
import { createSystem, useWorld, useDelta, useSystem } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { z } from "zod";

// define schema for system data/state
const Schema = z.object({
  active: z.boolean(),
});

export const System = createSystem("system-name")({
  system: Entrypoint,
  initialize: Initialize, // Optional: runs once on startup
  schema: {
    schema: Schema, // Optional: Zod or Standard Schema
    default: { active: true }
  },
  phase: "update", // "update" (logic) | "render" (visuals) | "all"
});

function Initialize() {
  // Setup logic (runs once)
}

function Entrypoint() {
  // Hooks must be called at the top level
  const world = useWorld();
  const [delta] = useDelta();
  
  // logic...
}
```

### 3. Use Context Hooks Correctly
The engine exports several hooks to access context within a system's `Entrypoint`. These *must* be used inside the system function.

| Hook | Description | Usage |
|------|-------------|-------|
| `useWorld()` | Returns the ECS World instance for querying entities and components. | `const world = useWorld();` |
| `useSystem(name)` | Accesses a system's state/data (including its own). Types are inferred from `Register`. | `const { data } = useSystem("engine:input");` |
| `useDelta()` | Returns the time delta for the current frame. | `const [delta] = useDelta();` |
| `useEngine()` | Returns the root engine instance. | `const engine = useEngine();` |
| `useSetScene()` | Returns a function to switch the active scene. | `const setScene = useSetScene();` |

### 4. Interact with the World
*   **Querying**: `world.query(ComponentA, ComponentB)` returns an array of Entity IDs that have all specified components.
*   **Component Access**: `world.get(entityId, ComponentClass)` returns the component instance.
*   **Component Utilities**: Components often expose `curr` (current state) and `prev` (previous state) for interpolation usage in render systems.

### 5. Leverage Core Systems
The engine provides built-in systems often prefixed with `engine:`.
*   `engine:input`: Handles input state (keys active, mouse position).
*   `engine:time`: Manages game time and deltas.

For creating **Reusable Plugins**, refer to the `engine-plugins` skill.
