---
name: engine-plugins
description: Patterns for creating and consuming plugins in the Better ECS workspace.
---

# Better ECS Engine Plugins Skill

This skill outlines the necessary patterns for building reusable plugins and consuming them within the engine.

## When to Use This Skill
You should use this skill when:
*   Creating reusable game functionality (e.g., FPS counters, Physics integrations, Developer tools).
*   Refactoring existing app-specific systems into shared plugins in `@repo/plugins`.
*   Adding external or shared functionality to an application's engine instance.
*   Designing configurable systems that need options passed at initialization (e.g., binding to a specific DOM element).
*   Working in the `packages/plugins` directory.

## What This Skill Does
*   **Defines the Factory Pattern**: Establishes the standard for creating configurable system factories.
*   **Explains Configuration**: Shows how to type and pass options to plugins.
*   **Demonstrates Consumption**: Guides how to register these plugins in the main engine entry point.

## Instructions

### 1. Create Plugins using the Factory Pattern
Plugins in `@repo/plugins` generally follow a **factory pattern**. They are functions that accept configuration options and return a system definition (created via `createSystem`).

**Structure**:
```typescript
import { createSystem, useSystem } from "@repo/engine";
import { z } from "zod";

// define schema
const Schema = z.object({
  enabled: z.boolean(),
  configValue: z.number(),
});

type PluginOptions = {
  initialValue: number;
  enableByDefault?: boolean;
}

// 1. Export the system factory
export const MyPlugin = (opts: PluginOptions) => {
  
  // 2. Return the createSystem call
  return createSystem("plugin:my-plugin")({
    system: Entrypoint,
    initialize: () => Initialize(opts), // Pass options to init if needed
    schema: {
        schema: Schema,
        default: { 
            enabled: opts.enableByDefault ?? true,
            configValue: opts.initialValue 
        }
    }
  });
  
  function Initialize(options: PluginOptions) {
      // setup resources (heavy lifting here, not in factory)
  }

  function Entrypoint() {
    // Access own state 
    const { data } = useSystem("plugin:my-plugin");
    
    if (!data.enabled) return;
    // ... logic
  }
};
```

### 2. Consume Plugins in App Entrypoints
Plugins are instantiated and passed to the `createEngine` function in the application.

```typescript
import * as Engine from "@repo/engine";
import { MyPlugin } from "@repo/plugins";

const engine = Engine.createEngine({
  systems: [
    // Instantiate the plugin with options
    MyPlugin({ 
        initialValue: 42,
        enableByDefault: true 
    }),
    // ... other systems
  ]
});
```

### 3. Follow Best Practices
1.  **Prefix Naming**: Use a prefix (e.g., `plugin:`) for system names to distinguish them from app-specific systems.
2.  **Configuration**: Expose necessary configuration via the factory arguments rather than hardcoding values.
3.  **Laziness**: Initialize heavy resources (event listeners, large data structures) in the `initialize` hook, not the factory function itself.
