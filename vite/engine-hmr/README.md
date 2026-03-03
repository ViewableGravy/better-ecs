# @repo/hmr

Vite plugin for Better ECS development with two responsibilities:

1. app-level system/scene hot reload with state preservation
2. engine-level full reload coordination to prevent constructor drift

## Why this exists

When the engine and client run in a shared Vite graph, in-place HMR can replace class/module references at runtime. For ECS component lookups that depend on stable constructor identity (for example `Debug`), this can cause mismatches where existing component instances no longer match the latest imported class.

`engineHmr()` solves this by:

- initializing a runtime cache on `globalThis.__ENGINE_HMR__`
- hot-swapping system/scene modules in-place for non-engine files (state retained)
- suppressing in-place updates for engine source files
- optionally coordinating source + dist change bursts when dist roots are configured
- emitting one debounced `full-reload` event for engine change bursts

This keeps module identity stable by rebuilding app state from a clean reload whenever engine code changes.

## Usage

```ts
import { engineHmr } from "@repo/hmr";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [engineHmr()],
});
```

## Options

```ts
type EngineHmrOptions = {
  sourceRoots?: readonly string[];
  distRoots?: readonly string[];
  debounceMs?: number;
  sourceAwaitDistMs?: number;
  distSettleMs?: number;
};
```

### `sourceRoots`

List of normalized source path fragments treated as engine-source changes.

Default:

```ts
["/src/engine/"]
```

### `distRoots`

List of normalized dist path fragments treated as engine-build output changes.

Default:

```ts
[]
```

### `debounceMs`

Debounce window for coalescing multiple file events into one reload.

Default: `60`

### `sourceAwaitDistMs`

When a source file changes and `distRoots` are configured, the plugin waits this
long for a dist change before reloading. This usually collapses source+dist
change bursts into one reload.

Default: `4000`

### `distSettleMs`

When dist files are changing, this defines the quiet-time window used to detect
that the dist write burst has settled before sending one reload.

Default: `450`

## Behavior summary

- **App system/scene edit** (outside configured engine roots) → in-place HMR boundary, system/scene behavior swapped while existing system state is preserved
- **Engine source edit** in `src/engine/**` → one full reload
- **Engine source edit** + dist burst (when `distRoots` are configured) → one full reload after dist settles
- **Engine source edit without dist follow-up** in time → one fallback full reload
- **Non-system/non-scene app edit** outside configured engine roots → standard Vite HMR behavior
