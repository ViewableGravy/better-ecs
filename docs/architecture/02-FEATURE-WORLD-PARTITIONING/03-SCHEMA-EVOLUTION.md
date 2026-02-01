# Schema Evolution & Versioning Strategy

## Constraint Check

Pure build-time code generation is insufficient because some components may be **dynamically imported** (lazy loaded), meaning they are not available during the static analysis phase of the build.

## Hybrid Strategy: Component-Defined History

We move the "source of truth" for versioning into the Component class itself, ensuring it travels with the code regardless of when it is loaded.

### The Pattern

```typescript
// src/components/transform.ts
@Serializable({
  version: 2,
  migrations: {
    1: (data: any) => ({ x: data.x, y: data.y, z: 0 }) // v1 -> v2 (added z)
  }
})
export class Transform {  
  @serializable("number") public x: number;
  @serializable("number") public y: number;
  @serializable("number") public z: number;
}
```

*Note: Serializable needs to be updated to support this decorator approach over extends*

### Workflow

1.  **Serialization (Save)**:
    - `PartitionManager` reads `Transform.schemaVersion` (e.g., 2).
    - Writes header: `{ "Transform": 2 }`.
    - Writes data using current shape.

2.  **Deserialization (Load)**:
    - `PartitionManager` reads header from disk: `{ "Transform": 1 }` (Old file).
    - Checks `Transform.schemaVersion` (Current: 2).
    - Detected mismatch: `1 < 2`.
    - Looks up `Transform.migrations[1]`.
    - Runs migration function on raw data.
    - Hydrates component.

### Optimization (Build Time)

While the *logic* is runtime, a build tool (`bun run ecs:optimize-assets`) can still be used to "squash" assets. It would:
1.  Load all known components.
2.  Read all asset files.
3.  Apply pending migrations.
4.  Save files with new version.
5.  (Optional) Strip migration code from production build if confirmed safe.
