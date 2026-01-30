# Engine Package AGENTS.md

## Package Overview

The `@repo/engine` package is the core ECS engine providing:
- Entity-Component-System architecture
- World management and queries
- System lifecycle (update/render phases)
- Scene management and transitions
- Type-safe hooks for system development

## Architecture Guidelines

### Manager Pattern for Engine Features

When adding new features to the engine, prefer creating a dedicated **Manager class** over adding methods directly to `EngineClass`:

```ts
// ✅ Good: Dedicated manager accessible via engine.scene
class SceneManager<TScenes> {
  set(sceneName: string): Promise<void>;
  get current(): string | null;
  get world(): UserWorld;
}

// Access via: engine.scene.set("game")

// ❌ Bad: Methods directly on engine
class EngineClass {
  setScene(name: string): Promise<void>;
  getActiveSceneName(): string;
  getActiveSceneWorld(): UserWorld;
}
```

**Benefits:**
- Keeps `EngineClass` lean and focused
- Groups related functionality logically
- Easier to test managers in isolation
- Better discoverability via namespace (e.g., `engine.scene.`, `engine.input.`)

### Hooks for System-Agnostic Access

For functionality that systems need to access without importing the engine directly, create hooks:

```ts
// ✅ Good: Hook captures context, returns bound function
export function useSetScene(): (sceneName: string) => Promise<void> {
  const engine = useEngine();
  return (sceneName) => engine.scene.set(sceneName);
}

// Usage in system (no engine import needed):
const setScene = useSetScene();
await setScene("game");
```

**When to create hooks:**
- When systems need access to engine features
- When you want type inference from the registered engine
- When the functionality requires engine context

### Internal Symbols for Type Branding

When creating types that need to be distinguished at runtime but shouldn't be fabricated by external code, use non-exported symbols:

```ts
// ✅ Good: Symbol is internal, not exported from package
export const SCENE_BRAND: unique symbol = Symbol.for("@repo/engine:scene");

export type SceneDefinition = {
  name: string;
  [SCENE_BRAND]: true; // Can only be set by createScene()
}

// ❌ Bad: String property can be spoofed
export type SceneDefinition = {
  name: string;
  ["~scene"]: true; // Anyone can set this
}
```

## Testing

See top-level AGENTS.md for testing instructions. Engine-specific notes:

- Type tests go in `src/tests/type-registration/`
- Runtime tests go in `src/tests/{feature}/`
- Each test directory should have its own `tsconfig.json` to isolate type registrations

## Exports

The engine should export:
- Core types and helpers (`createEngine`, `createSystem`, `createScene`)
- Hooks (`useWorld`, `useSystem`, `useSetScene`, etc.)
- Type utilities (`AllSystemNames`, `AllSceneNames`)

**Do NOT export:**
- Internal symbols (e.g., `SCENE_BRAND`)
- Internal manager implementation details
- Test utilities
