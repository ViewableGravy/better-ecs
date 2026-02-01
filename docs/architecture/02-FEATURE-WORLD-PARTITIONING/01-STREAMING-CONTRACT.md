# Streaming Contract

## Core Principle

The Engine defines the contract; the Plugin provides the implementation.

## 1. The World Interface Contract

Systems and Queries in `Better ECS` are fundamentally **synchronous**. They operate on the assumption that if an ID exists in `world.query(A, B)`, strictly both A and B are present on that entity at that exact moment.

**The Immutable Rule:**
> A `PartitionWorld` or `StreamingWorld` MUST implement the synchronous `UserWorld` interface. It cannot "await" an entity during a query.

**Implication for Streaming:**
Partitioning (I/O) must be decoupled from Simulation (ECS).
- **Wrong**: `world.get(id)` fetches from disk (Async/Blocking).
- **Right**: `StreamingSystem` fetches from disk -> buffers in memory -> injects into `world` synchronously at the start of a frame.

## 2. The Streaming Contract

To support partition streaming without breaking determinism or causing frame spikes, we establish a **Streaming Contract** between the Partition Plugin and the Engine.

### Phase 1: Async Fetch (The "Backstage")
*Occurs in: Worker Thread / Network Request / Idle Callback*
- Partition logic identifies required chunks.
- Data is fetched (JSON/Binary) and deserialized into **Component Data Buffers** (POJOs/TypedArrays).
- **No Entity IDs** are assigned in the main World yet.
- **No Engine Events** are fired.

### Phase 2: Sync Hydration (The "Stage")
*Occurs in: `PreUpdate` or specific `StreamingPhase`*
- The Engine receives a command: `commitPartition(data)`.
- **Batch Creation**: Engine reserves N entity IDs.
- **Batch Insertion**: Components are attached immediately.
- **Atomic Availability**: Entities appear in queries fully formed in the same frame.

### Phase 3: Lifecycle Events
- **Problem**: Adding 10,000 entities triggers 10,000 `OnCreate` events.
- **Solution**: Introduce `World.batchAction` primitives to group notifications or suppress them during initial load.

## 3. Required Engine Primitives

To support this contract efficiently, the Engine requires extensions to the `World` interface.

### A. Batch Operations
Currently, `world.add` is 1:1. We need primitives to reduce overhead and GC pressure.
```typescript
interface World {
  // ... existing
  
  /**
   * Efficiently create multiple entities and populate components.
   * Prevents query cache thrashing by updating indices once at the end.
   */
  loadEntities(batch: EntityBatch): EntityId[];
}

type EntityBatch = {
  // Component-centric data structure for structure-of-arrays friendly loading
  components: Map<ComponentClass, any[]>;
  count: number;
}
```

### B. Event Suspension
```typescript
interface World {
  suspendEvents(): void;
  resumeEvents(): void;
}
```
*Usage:* Call suspend/resume around `loadEntities` to prevent event storms, or specialized systems can subscribe to `OnPartitionLoaded` instead of individual entity events.

## 4. Serialization Boundaries

The `Serializable` components are compatible with this model because they are decoupled from the `World` instance.

- **Serialization**: `Component -> JSON/Buffer` (Happens via `Serializable`)
- **Storage**: `PartitionPlugin` manages File I/O.
- **Hydration**: `Structure -> World` (Happens via proposed `loadEntities` or iterated `add`).
