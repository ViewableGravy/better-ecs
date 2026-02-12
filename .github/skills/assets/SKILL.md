---
name: assets
description: Guidelines for defining, loading, and accessing game assets using the @repo/engine asset management system.
---

# Asset Management Skill

This skill provides the guidelines and API references for managing game assets (sprites, textures, data) in the Better ECS workspace.

## When to Use This Skill

You should use this skill when:

- Adding new images, audio files, or other binary resources to the project.
- Implementing preloading logic for scenes or the game startup.
- Accessing resources within systems (e.g., rendering sprites) or entity factories.
- Debugging asset loading errors or missing textures.

## What This Skill Does

- **Standardizes Asset Definition**: Explains where and how to register assets in the central loader for strict typing.
- **Clarifies Asset Placement**: Defines the correct directory structure (`public/`) for ensuring assets are served correctly.
- **Documents Access Patterns**: Shows how to use the `useAssets` hook and retrieval methods (`get`, `getStrict`, `load`).
- **Explains Loading Lifecycle**: Details the difference between lazy loading and preloading.

## Instructions

### 1. Define Global Assets

Global assets must be registered in `apps/client/src/assets/index.ts`. This registration generates the strict types used throughout the application.

```typescript
// apps/client/src/assets/index.ts
import { createAssetLoader, createLoadImage } from "@repo/engine/asset";
import MyAsset from "@/assets/my-asset";
import Player from "@/assets/player";

export const Loader = createAssetLoader({
  "player-sprite": createLoadImage(Player),
  "my-asset": createLoadImage(MyAsset),
});
```

### 2. Place Asset Files

Actual asset files should be placed in the `apps/client/assets` directory. The path used in `createLoadImage` should be an import using vite to import the path.

- **File Location**: `apps/client/assets/player.png`
- **Loader Path**: `apps/client/assets/index.ts`

### 3. Access Assets in Systems/Scenes

Use the `useAssets()` hook to retrieve the `AssetManager`. This hook is available within any function running inside the engine context (Systems, Scene setup, etc.).

```typescript
import { useAssets } from "@repo/engine";

// Inside a System or Scene setup
const Assets = useAssets();
```

### 4. Loading and Retrieval Strategy

#### Preloading (Recommended for Scenes)

Use `Assets.load()` to ensure resources are ready before they are needed. This returns a Promise.

```typescript
// In Scene setup
await Assets.load("player-sprite");
```

#### Strict Retrieval (Safe)

Use `getStrict` when you are certain the asset is loaded (e.g., after preloading). This throws an error if the asset is missing or not ready, helping catch logic errors early.

```typescript
// Throws if "player-sprite" is not ready
const image = Assets.getStrict("player-sprite");
```

#### Lazy Retrieval (Dynamic)

Use `get` for assets that might not be loaded yet. It returns `undefined` if missing and triggers a background load if not already loading/loaded.

```typescript
const image = Assets.get("player-sprite");
if (image) {
  // Render image
} else {
  // Show placeholder or wait
}
```
