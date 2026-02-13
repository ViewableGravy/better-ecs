# Cleanup of Unused System Files

## User Request

> 7. apps/client/src/systems/spatial-contexts-demo/index.ts
>    Remove all unused files

## Current Implementation

The directory `apps/client/src/systems/spatial-contexts-demo/` contains an `index.ts` that explicitly states it has moved:

```typescript
// Moved to scene-local portal-driven setup in:
// apps/client/src/scenes/spatial-contexts-demo/index.ts
export {};
```

Additionally, there are placeholder systems in `apps/client/src/systems/` that might be redundant with the new scene-local setup in the spatial-contexts demo.

## Proposed Changes

1. **Delete Dead Files**: Remove `apps/client/src/systems/spatial-contexts-demo/index.ts`.
2. **Audit `src/systems/`**: Check `collision/`, `physics/`, `movement/`, and `initialisation/` to see if they are actually used by any scene. If they are empty shells or duplicated logic, remove them.
3. **Check `apps/client/src/systems/scene-demo.ts`**: Verify if this is still needed or can be removed in favor of the newer scene structure.

## Benefits

- **Reduced Complexity**: Less files to navigate in the workspace.
- **Clarified Architecture**: Makes it obvious that the current demo logic resides in `src/scenes/`.
- **Cleaner Imports**: Prevents accidental imports of legacy or empty system skeletons.
