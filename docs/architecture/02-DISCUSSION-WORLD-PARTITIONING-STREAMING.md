# Discussion: World Partitioning & Entity Streaming

**Status**: Discussion/Exploration  
**Phase**: Post-Rendering Foundations (Phase 1)  
**Author Notes**: This document explores architectural options for open-world entity streaming. It is intentionally open-ended and presents trade-offs for colleague discussion and feedback.

---

## Problem Statement

Better ECS targets open-world game development where:

- **Large worlds**: Millions of entities cannot exist in memory simultaneously
- **Player-relative streaming**: Entities load/unload based on player proximity
- **Serialization pipeline**: Entities must be persistently stored and dynamically loaded
- **Performance critical**: Streaming happens continuously during gameplay

**Current limitations**:
- Single `World` instance contains all active entities
- No built-in spatial partitioning or streaming logic
- Entity loading/unloading is ad-hoc, manual

---

## Question 1: Where Should Partitioning Live?

### Core Purpose: Serialization & Streaming Boundary

**Key Insight**: The primary purpose of world partitioning is to act as a **serialization and deserialization boundary**. Rather than storing all entities in memory and querying which ones to render, we maintain only near-player entities in the `World` and store others persistently. This is fundamentally different from a rendering filter.

**Architecture Principle**:
- **World contains**: Only entities within range of player
- **Storage contains**: All entities, spatially indexed (quadtree/octree)
- **Streaming pipeline**: 
  1. Query spatial index for partitions near player
  2. Load entities from those partitions into World
  3. Save & remove entities from far partitions
  4. World queries are now cheap (only active entities)

This transforms entity queries from O(n) scans of all entities to O(m) queries where m = nearby entity count.

---

### Option A: Engine Core Abstraction (World Subclasses)

**Concept**: Define different world "types" with explicit serialization/streaming behavior:

```typescript
// packages/engine/src/ecs/world.ts
export class World { /* existing */ }

export class PartitionedWorld extends World {
  private partitions: Map<string, Partition>;
  private spatialIndex: SpatialIndex;  // Quadtree/octree
  
  // Main API: Load/unload partitions
  async streamInPartition(partitionId: string): Promise<void> {
    const entities = await this.spatialIndex.loadPartition(partitionId);
    for (const entity of entities) {
      this.add(entity.id, ...entity.components);
    }
  }
  
  async streamOutPartition(partitionId: string): Promise<void> {
    // Serialize entities in this partition
    const entities = this.getPartitionEntities(partitionId);
    await this.spatialIndex.savePartition(partitionId, entities);
    // Remove from World
    for (const e of entities) {
      this.destroy(e);
    }
  }
  
  // Query nearby without checking stored entities
  async queryNearby<T extends readonly Component[]>(
    position: Vec2,
    range: number,
    ...components: T
  ): Promise<Entity[]> {
    // Returns only entities currently in World that match
    // Plugin decides which partitions to load based on this
    return this.query(...components)
      .filter(e => this.getDistance(e, position) < range);
  }
  
  // Spatial helpers
  getPartition(position: Vec2): PartitionId;
  getAllPartitions(): PartitionId[];
  getPartitionEntities(partitionId: PartitionId): Entity[];
}

export class StreamingWorld extends PartitionedWorld {
  // Convenience: auto-manages streaming based on player position
  async updateStreaming(playerPosition: Vec2, streamRange: number): Promise<void> {
    // Load partitions within range
    // Unload partitions outside range
  }
}
```

**Pros**:
- **Core capability**: Serialization/deserialization built-in
- **Natural API**: World manages its own partitions
- **Optimizable**: Engine controls spatial index and I/O
- **Type-safe**: Clear streaming lifecycle
- **Performance**: Eliminates full-world queries

**Cons**:
- Locks engine API early
- Different world types increase maintenance
- Games without streaming pay for hierarchy
- Requires storage backend integration

---

### Option B: Plugin System (Partition Provider)

**Concept**: Partitioning wraps a standard `World`, managing serialization externally:

```typescript
// packages/plugins/world-partitioning/

export interface StorageProvider {
  loadPartition(id: string): Promise<SerializedEntity[]>;
  savePartition(id: string, entities: SerializedEntity[]): Promise<void>;
}

export interface SpatialIndexProvider {
  getPartitionsInRange(pos: Vec2, range: number): string[];
  getPartition(pos: Vec2): string;
}

export class StreamingWorldWrapper {
  constructor(
    private world: World,
    private storage: StorageProvider,
    private spatialIndex: SpatialIndexProvider
  ) {}
  
  // Main API: Stream partitions in/out
  async streamInPartition(partitionId: string): Promise<void> {
    const serialized = await this.storage.loadPartition(partitionId);
    for (const entity of serialized) {
      // Deserialize and add to world
      this.world.add(entity.id, ...entity.components);
    }
  }
  
  async streamOutPartition(partitionId: string): Promise<void> {
    const entities = this.world.query(...).filter(e => 
      this.spatialIndex.getPartition(e.position) === partitionId
    );
    // Serialize and save
    const serialized = entities.map(e => serializeEntity(e));
    await this.storage.savePartition(partitionId, serialized);
    // Remove from world
    for (const e of entities) {
      this.world.destroy(e);
    }
  }
  
  // Track loaded partitions
  getLoadedPartitions(): Set<string>;
  isPartitionLoaded(partitionId: string): boolean;
}
```

**Pros**:
- Zero engine changes
- Flexible storage backends (filesystem, DB, etc.)
- Easy to iterate on spatial indexing strategies
- Clear plugin responsibility
- Multiple streaming strategies can coexist

**Cons**:
- Plugin must manage full serialization pipeline
- Less integration with World lifecycle
- Manual wrapping of all operations
- Storage format not standardized in engine

---

### Option C: Component-Based (Spatial Component)

**Concept**: Partitioning via component + system (NOT RECOMMENDED):

```typescript
// Marks entity's partition
export class SpatialPartition {
  partitionId: string;
  position: Vec2;
}

// Query only nearby entities (requires scanning all)
const spatialQuerySystem = createSystem("spatialQuery")({
  system() {
    const world = useWorld();
    const playerPos = getPlayerPosition();
    
    // PROBLEM: Scans all entities in World
    for (const e of world.query(SpatialPartition, Transform)) {
      if (distance(e.pos, playerPos) < RANGE) {
        // nearby
      }
    }
  }
});
```

**Pros**:
- Minimal API surface
- Fits existing component patterns

**Cons**:
- **Critical flaw**: Does not solve the core problem
- Still stores all entities in World memory
- O(n) query even with spatial component
- No automatic serialization/removal
- Defeats purpose of partitioning

**Recommendation**: Do not use for streaming. Component-based spatial queries are useful only for in-memory spatial relationships.

---

## Question 2: Where Does Entity Streaming Live?

### Streaming Lifecycle

Entities need:

1. **Storage**: Persistent files (JSON, binary, etc.)
2. **Serialization**: Entity → storage format
3. **Deserialization**: Storage format → Entity
4. **Streaming In**: Create entity in world
5. **Streaming Out**: Destroy entity, save to storage
6. **Lifecycle**: Track loaded/unloaded state

### Option A: Plugin (Dedicated Streaming Plugin)

```typescript
// packages/plugins/entity-streaming/

export interface StreamingWorld {
  streamInPartition(partitionId: string): Promise<void>;
  streamOutPartition(partitionId: string): Promise<void>;
  getLoadedPartitions(): Set<string>;
}

export const createStreamingWorld = (
  world: World,
  storageProvider: StorageProvider,
  partitionProvider: PartitionProvider
): StreamingWorld => {
  return {
    async streamInPartition(partitionId: string) {
      const entities = await storageProvider.load(partitionId);
      for (const entity of entities) {
        world.add(entity.id, entity.components);
      }
    },
    
    async streamOutPartition(partitionId: string) {
      const entities = world.query(...).filter(e => 
        getPartition(e) === partitionId
      );
      await storageProvider.save(partitionId, entities);
      for (const e of entities) {
        world.destroy(e);
      }
    }
  };
};
```

**Pros**:
- Clear responsibility
- Works with any world type
- Storage provider is pluggable
- Easy to test

**Cons**:
- Requires coordination with partitioning
- Storage format decisions deferred

---

### Option B: Core Engine Feature

**Concept**: Engine provides serialization + streaming primitives

```typescript
// packages/engine/src/serialization/streaming.ts
export interface Streamable {
  toJSON(): SerializedEntity;
  fromJSON(data: SerializedEntity): void;
}

export class StreamingManager {
  async loadPartition(id: string): Promise<Entity[]>;
  async savePartition(id: string, entities: Entity[]): Promise<void>;
}
```

**Pros**:
- Integrated with engine lifecycle
- Better performance optimization
- Core feature for open-world games

**Cons**:
- Complex API surface
- Storage backend locked to engine decisions
- Harder to customize

---

## Question 3: Different World Types - API Design

If we go with Option A (Engine subclasses), how should users create and work with them?

### Approach 1: World Factory Functions

```typescript
const world = createPartitionedWorld({
  partitionSize: 64,
  algorithm: "grid" | "quadtree" | "octree"
});

const streamingWorld = createStreamingWorld(world, {
  storage: new FileSystemStorage("./world-data"),
  partitionProvider: new GridPartitionProvider({ size: 64 })
});
```

**Pros**: Explicit, flexible  
**Cons**: Many parameters

---

### Approach 2: Scene Configuration

```typescript
export const createScene = (name) => ({
  worldType: "streaming",
  worldConfig: {
    partitionSize: 64,
    storage: "filesystem",
    storageRoot: "./world-data"
  },
  
  setup(world) {
    // world is already StreamingWorld
  }
});
```

**Pros**: Declarative, hooked into scene lifecycle  
**Cons**: Config explosion

---

### Approach 3: Plugin Registration

```typescript
// Register streaming as a capability
const worldWithStreaming = addStreamingPlugin(world, {
  storage: new FileSystemStorage(),
  partitionProvider
});

// Or as scene wrapper
createContextScene("game")({
  plugins: [streamingPlugin],
  setup(world) { }
});
```

**Pros**: Flexible, stackable  
**Cons**: Runtime wrapping, less type-safe

---

## Question 4: Storage & Serialization Strategy

### Storage Format

**Option A: Per-Partition JSON**

```
./world-data/
  ├── partition_0_0.json
  ├── partition_1_0.json
  └── partition_1_1.json
```

Each file contains:
```json
{
  "partitionId": "0_0",
  "entities": [
    {
      "id": "entity_123",
      "components": {
        "Transform": { "x": 10, "y": 20 },
        "Sprite": { "texture": "player.png" }
      }
    }
  ]
}
```

**Pros**: Human readable, debuggable  
**Cons**: File I/O overhead, no schema validation

---

**Option B: Binary Format with Index**

```
./world-data/
  ├── index.bin       # Partition metadata
  ├── entities.bin    # All entities (binary)
  └── partition_offsets.json  # Quick lookup
```

**Pros**: Compact, fast I/O  
**Cons**: Complex serialization, harder to debug

---

**Option C: Database (SQLite, etc.)**

```sql
CREATE TABLE partitions (
  id TEXT PRIMARY KEY,
  loaded_at TIMESTAMP
);

CREATE TABLE entities (
  id TEXT,
  partition_id TEXT,
  data BLOB,
  FOREIGN KEY(partition_id) REFERENCES partitions(id)
);
```

**Pros**: Query support, transactions  
**Cons**: External dependency, overkill for simple games

---

## Question 5: Streaming Strategy

### When to Stream In/Out?

**Option A: Distance-Based (Simple)**

```typescript
const streamingSystem = createSystem("streaming")({
  system() {
    const world = useWorld();
    const player = getPlayer();
    
    for (const partition of world.getAllPartitions()) {
      const distance = getDistance(player.pos, partition.center);
      
      if (distance < STREAM_IN_DISTANCE) {
        world.streamIn(partition.id);
      } else if (distance > STREAM_OUT_DISTANCE) {
        world.streamOut(partition.id);
      }
    }
  }
});
```

**Pros**: Straightforward, predictable  
**Cons**: No pre-loading, sudden frame drops

---

**Option B: Hysteresis (Prevents Thrashing)**

```typescript
// Different thresholds for in/out prevents rapid toggling
if (distance < STREAM_IN_DISTANCE && !partition.loaded) {
  world.streamIn(partition.id);
} else if (distance > STREAM_OUT_DISTANCE && partition.loaded) {
  world.streamOut(partition.id);
}
```

---

**Option C: Predictive (Player Velocity)**

```typescript
const predictedPos = player.pos + player.velocity * PREDICTION_TIME;
const predictedDistance = getDistance(predictedPos, partition.center);

// Pre-load partitions player is moving toward
if (predictedDistance < STREAM_IN_DISTANCE) {
  world.streamIn(partition.id);
}
```

---

## Question 6: Integration with Spatial Contexts

Once we have world partitioning + streaming working in a single world, how does it interact with spatial contexts (Phase 3+)?

### Approach 1: Independent

```
Scene
 ├── World("overworld")
 │   ├── Partition(0, 0)  [streamed]
 │   ├── Partition(1, 0)  [streamed]
 │   └── Partition(1, 1)  [not loaded]
 │
 └── World("house_1")     [always loaded, small]
```

Each context is its own streaming space. Contexts don't interact.

---

### Approach 2: Hierarchical

```
Scene
 ├── World("overworld")    [partitioned, streamed]
 │   ├── House portals (static, always loaded)
 │   └── Overworld streaming
 │
 └── World("house_1")      [loaded when player nearby]
```

Contexts respect partitioning of parent context.

---

## Proposed Path Forward

### Phase 2: World Partitioning Investigation (1 week)

**Goal**: Decide engine vs plugin, design API

**Deliverables**:
1. Spike: Implement all three approaches (engine subclass, plugin wrapper, component-based)
2. Performance comparison on 100k+ entities
3. API design decision document
4. Recommendation to team

**Acceptance**:
- [ ] Proof-of-concept for each approach
- [ ] Performance benchmarks
- [ ] Decision made on architecture

---

### Phase 3: Entity Streaming Pipeline (1-2 weeks)

**Goal**: Implement chosen partitioning + streaming system

**Depends on**: Phase 2 decision + Phase 1 rendering

**Tasks**:
1. Implement partitioning abstraction
2. Implement serialization/deserialization
3. Implement streaming lifecycle (in/out)
4. Build streaming system
5. Storage provider (file system)
6. Create open-world demo scene

---

### Phase 4: Streaming Optimizations (1 week, optional)

**Goal**: Performance polish

**Tasks**:
1. Async I/O (non-blocking loads)
2. Predictive streaming
3. Memory pooling for entities
4. Streaming priority queue (load nearest first)

---

## Open Questions for Discussion

1. **Engine vs Plugin**: Which approach aligns with Better ECS philosophy?
   - Engine core should stay minimal, but world partitioning is foundational for open-world games
   - Could we do a hybrid: engine provides primitives, plugin provides convenience?

2. **World Types**: Should we have `World`, `PartitionedWorld`, `StreamingWorld`?
   - Or should these be capability layers added at runtime?

3. **Storage**: JSON, binary, or database?
   - JSON is debuggable but slow
   - Binary is fast but harder to work with
   - Database adds dependency but enables queries

4. **Streaming Trigger**: Distance-based, hysteresis, or predictive?
   - Distance-based is simplest
   - Hysteresis prevents thrashing
   - Predictive smooths frame pacing

5. **Integration Point**: When in the roadmap does spatial contexts interact with partitioning?
   - Do contexts inherit partitioning from parent world?
   - Or is each context its own streaming space?

6. **Type Safety**: How much should TS help with partitioning?
   - Generic partition types?
   - Compile-time partition definitions?
   - Runtime partition providers?

---

## References

- **Related**: [00-SPATIAL-CONTEXTS-ARCHITECTURE.md](./00-SPATIAL-CONTEXTS-ARCHITECTURE.md) - Contexts may interact with streaming
- **Related**: [01-IMPLEMENTATION-ROADMAP.md](./01-IMPLEMENTATION-ROADMAP.md) - Main timeline
- **Related**: [02-FEATURE-RENDERING-ABSTRACTIONS.md](./02-FEATURE-RENDERING-ABSTRACTIONS.md) - Phase 1 rendering

