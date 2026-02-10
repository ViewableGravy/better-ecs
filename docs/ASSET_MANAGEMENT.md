# Asset Management Architecture

This document outlines the architecture for a type-safe, engine-scoped asset management system for `better-ecs`.

## Core Philosophy

Asset management is localized to the **Engine Instance** rather than using a global singleton. This ensures isolation between multiple engine instances and provides a unified entry point for type inference via the `Register` pattern.

## Type Safety & Naming Convention

The system utilizes TypeScript template literal types to enforce a hierarchical naming convention. This allows for global, scene-scoped, and world-scoped assets with full IntelliSense. (noting that we will not be implenmenting scene and world level assets for now)

### Naming Schemes

- **Global Assets**: `global:${path}` (Available across the entire engine)
- **Scene Assets**: `${sceneName}:${path}` (Scoped to a specific scene)
- **World Assets**: `${sceneName}:${worldName}:${path}` (Scoped to a specific world instance)

### Global Registry

Users augment the `Register` interface using the `engine` which contains the necessary generics to register the type of Assets for the engine.

```ts
declare module '@repo/engine' {
  interface Register {
    Engine: ReturnType<typeof createEngine>;
  }
}
```

Note: this will use the same pattern as we use for scene registration and system registration, so this should be referenced for how we infer the types

## The AssetManager

The `AssetManager<T>` class is instantiated per engine and serves as the primary controller for resource lifecycle.

### Retrieval API

- **`getStrict(key)`**: Returns the asset or throws a `tiny-invariant` error if it is not yet resolved. Invariant messages are prefixed with `[AssetManager]` for debugging.
- **`get(key)`**: Triggers a load if the asset is missing and returns `T | undefined`. This enables "lazy loading" during system execution.
- **`getLoose(path)`**: A non-strictly typed version that accepts any string and triggers a load, returning `any | undefined`.

Note: similar to current implementation but with these explicit methods and type safe using T

### State Tracking

The manager tracks the status of every asset:

- `loading`: Asset is currently being fetched.
- `error`: Asset failed to load (captured in internal logs).
- `ready`: Asset is synchronously available.

### Fallback Strategy (Future)

To prevent runtime crashes when assets fail to load (e.g., a missing texture), the `get` methods will eventually support a "Fallback Registry" to provide default empty textures or null-objects.

## Engine Integration

### Initialization

Assets are registered in a "loader". This is not aware whether it will be registered on the engine, scene or world (again, scene/world is not yet possible) and therefore the names are just standard `/` delimited names, which will later be inferred on the engine type.

All assets will follow a standard interface, but may use a different adapter for png/video/binary/audio/etc. Adapters carry the load of work for more complicated loading (i.e. handling their specific loading mechanism) while the loader just puts them together with some general settings (for now there are no other settings).

```ts
// assets/loader.ts
export const loader = createAssetLoader({
    assets: {
        "sprites/player": createLoadImage("/player.png"),
    }
    ...
})

// main.ts
const engine = createEngine({
  systems: [...],
  scenes: [...],
  assetLoader: myAssetLoader
});
```

### Contextual Hooks

Systems interact with assets using the `useAssets()` hook, which provides access to the engine-scoped manager with full type safety derived from `RegisteredEngine`.

```ts
const assets = useAssets();
const playerSprite = assets.getStrict('global:sprites/player');
```

## Persistence & Lifecycle

- **Infinite Cache**: By default, assets are cached for the duration of the engine's lifecycle.
- **No Global Singleton**: Removing the module-level singleton prevents cross-instance state pollution.
- **Cleanup (Future)**: Support for `markForCleanup(key)` or scene-based `AssetViews` that handle cache evacuation will be implemented later.

## Roadmap & Advanced Features

### 1. Asset Streaming (TanStack AI Style)

Implementation of an "Adapter" approach for handling binary streams, VBOs, and large audio chunks. This will allow the engine to process data as it arrives via readable streams rather than waiting for full resolution.

### 2. Auto-Code Generation

A Vite plugin to scan `public/` or an `assets/` directory and automatically generate the `Register['Assets']` interface and loader mapping.

### 3. Log Reporting

The engine will maintain a `logs` array. When debug mode is enabled, asset fetch warnings and errors from the manager will be automatically surfaced to the console.

### 4. Hierarchical Views

Internal support for `AssetManager.createView<TNamespace>()` to allow scenes or worlds to interact with a subset of the global cache, maintaining their own isolated manifests while sharing the underlying store.
