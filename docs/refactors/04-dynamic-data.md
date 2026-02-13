# Dynamic Data vs Constants

## User Request

> 4. constants.ts
>    I don't think that we should have a constants.ts file, games are very dynamic, and we ultimately need systems to act on arbitrary amounts of data. It would be ideal if a house or other region has an identifier (i.e. component) if they need to be targetted, and then we can just select and iterate over those targets. Having constants just breaks the ability to generalize in this case, and makes iterating in the future harder

## Current Implementation

The file [apps/client/src/scenes/spatial-contexts-demo/constants.ts](apps/client/src/scenes/spatial-contexts-demo/constants.ts) currently hardcodes values:

```typescript
export const OVERWORLD = contextId("default");
export const HOUSE = contextId("house_1");
export const DUNGEON = contextId("dungeon_1");

export const HOUSE_HALF_WIDTH = 160;
export const HOUSE_HALF_HEIGHT = 120;
```

These are used in factories and systems to identify where to move the player or how to size objects.

## Proposed Changes

1. **Use Components for Identification**: Instead of `HOUSE` constant, use a `ContextIdentity` component or a `Name` component on the entity representing the context.
2. **Metadata Components**: Move dimensions (like `HOUSE_HALF_WIDTH`) onto components like `Dimensions` or `Boundary` on the specific instance entity.
3. **Query-Based Targeting**: Systems should query for entities with specific components rather than referencing constants. For example, search for an entity with `ContextEntryRegion` and `TargetContext("house_1")`.
4. **Data-Driven Configuration**: If configuration is needed, it should be passed during initialization or loaded from a config file (JSON/Zod schema) rather than being hardcoded in TS files.

## Benefits

- **Flexibility**: Multiple houses can exist with different dimensions without code changes.
- **Dynamic Content**: Identifiers and properties can be changed at runtime or loaded from a server.
- **Better Tooling**: Easier to create a visual editor if data is stored in components.
