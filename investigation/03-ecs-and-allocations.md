# ECS and Allocation Investigation

## Scope

This report covers ECS entity/component storage, query and component-access mechanics, simulation hot loops, and
source-visible allocation sites. It separates costs caused by entity count, component layout, query design,
renderer extraction, and conveyor/transform simulation. Networking was excluded.

Production code was not changed. The raw measurements and static scan supporting this report are retained under
`investigation/evidence/measurements/`.

## Method

1. Traced `EntityId`, `ComponentStore`, `World.query`, `World.forEach1/2/3`, and `UserWorld` component access.
2. Audited production query call sites and the transform snapshot, world-transform, conveyor-item, physics, and
   sprite-extraction loops.
3. Counted allocations when the source establishes an exact count (for example, result slots and explicit object
   literals). Counts are source-level allocations; a JavaScript JIT may scalar-replace non-escaping objects.
4. Ran a focused Bun 1.2.18 CPU benchmark at 100k, 250k, 500k, and 1M entities. The harness extracts the current
   `ComponentStore`, `World.query`, and `World.forEach` algorithms into a dependency-free benchmark. Each case has
   five warmups and 12–30 measured repetitions; the report uses medians.

### Runner limitation

This is an algorithm microbenchmark, not an end-to-end engine benchmark. Directly importing `World` with the
available Bun runner failed on directory-style TypeScript aliases such as `@engine/components`; the installed
system Node is v12 and cannot run current Vitest. I therefore did not present the results as application frame
times. They are trustworthy for relative behavior of the extracted loops, but browser profiles remain the
authority for absolute costs, GC, and JIT behavior.

Evidence:

- [Raw JSONL results](evidence/measurements/ecs-query-benchmark-results.jsonl)
- [Static scan and allocation formulas](evidence/measurements/ecs-static-scan.txt)

## Evidence

### Architecture observed

`World` holds all live IDs in a `Set` and component types in a `Map<Function, ComponentStore>`
(`src/engine/src/ecs/world.ts:266-268`). Each component store holds a dense component-reference array, a dense
entity-ID array, and a `Map<number, number>` sparse index (`src/engine/src/ecs/storage.ts:9-12`). This is a
reasonable sparse-set shape, but only the outer arrays are packed; component values remain JavaScript objects.

A `get` follows two maps and one array: component constructor → store, entity index → dense index, dense index →
component (`src/engine/src/ecs/world.ts:433-437`, `src/engine/src/ecs/storage.ts:41-47`). A multi-component query
selects the smallest store and performs sparse membership checks against the other stores
(`src/engine/src/ecs/world.ts:522-605`). The selection strategy is good.

The important API split is:

- `query(...)` always materializes an entity-ID array. Even the single-component fast path spreads the dense IDs
  into a new array (`src/engine/src/ecs/world.ts:569-573`).
- `forEach1/2/3` walks dense arrays directly and supplies components to the callback without a query-result array
  or follow-up `world.get` (`src/engine/src/ecs/world.ts:608-753`).

The static scan found 68 production query expressions and 15 production `forEach` expressions. This is not a
frequency measurement, but it shows that the cheaper API exists and is not yet the dominant idiom.

### Measurements

### Dense layout: all entities have A and B

Median milliseconds per complete operation:

| Entities | `query(A)` IDs | `query(A)` + `get(A)` | `forEach1(A)` | `query(A,B)` + 2 gets | `forEach2(A,B)` |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100k | 1.13 | 3.12 | 0.47 | 8.94 | 2.34 |
| 250k | 3.04 | 12.77 | 1.23 | 38.40 | 9.81 |
| 500k | 5.48 | 42.88 | 2.66 | 111.37 | 38.27 |
| 1M | 14.96 | 104.83 | 6.24 | 277.35 | 87.78 |

The benchmark does **not** say the application spends these exact times in ECS. It does show:

- Result construction scales with the candidate/result count.
- Querying IDs and then retrieving components repeats map work.
- Direct dense iteration is materially cheaper in this runtime.
- At very large dense intersections, component-map access becomes expensive enough that query design matters
  before considering rendering.

### Selective layout

With 500k A components but only 50k B components (B stride 10), `query(A,B)` + two gets fell from 111.37 ms to
11.49 ms, and `forEach2` fell from 38.27 ms to 4.65 ms. The current smallest-store selection is effective.
Entity count alone is therefore not the query cost: the smallest candidate store and matched layout matter.

### Memory observation

The extracted dense 1M A+B harness increased process RSS by about 451 MiB after forced GC. This is a coarse
process delta, not a per-component size: it includes Bun allocator capacity and the harness's Set, Maps, arrays,
and component objects, and excludes several real-engine structures. The non-monotonic heap deltas in the raw
results make them unsuitable for capacity planning. A browser heap snapshot of the real scene is required.

## Findings

### F1 — The current entity-ID scheme leaves almost no room above a 1M scenario

**Confidence: high. Impact: correctness/capacity, immediate.**

The lower 20 bits provide 1,048,576 indexes; index zero is skipped and creation throws when `nextIndex` reaches
the limit (`src/engine/src/ecs/entity.ts:55-77`). Destroy increments a generation but does not return the index to
a free list (`src/engine/src/ecs/entity.ts:120-127`). Therefore the cap is 1,048,575 IDs created over the process
lifetime, across worlds, not a reusable simultaneous-entity budget.

A 1M visible-entity target leaves only 48,575 IDs for cameras, belts, decorations, invisible helpers, destroyed
entities, and other worlds. If "500k visible entities" includes items whose belts and render helpers are separate
entities, the total can exceed the visible count substantially.

### F2 — Hot `query` + `get` loops pay for copying and repeat lookup work

**Confidence: high for mechanics; medium for frame contribution until browser profiling.**

`query` allocates `stores`; multi-component queries also allocate `otherStores` and `result`
(`src/engine/src/ecs/world.ts:543-605`). The rest parameter also exposes a per-call component-types array at the
language level, although a JIT may optimize it. Callers that then invoke `get` repeat component-store and sparse
map lookups.

The clearest hot example is `transformSnapshotSystem`: it issues three single-component queries and calls `get`
for every returned ID (`src/engine/src/systems/transformSnapshot.ts:9-30`). Per update, those three result arrays
contain exactly:

`count(Transform2D) + count(WorldTransform2D) + count(Transform3D)`

entity-ID slots. At 500k `Transform2D` plus 500k `WorldTransform2D`, that is 1M fresh array slots per update.
If a runtime uses eight-byte element slots, the backing-store lower-order estimate is about 8 MB/update, excluding
headers and capacity; JavaScript engines are free to represent numeric arrays differently, so this is a stated
model, not a heap measurement.

### F3 — Dense arrays do not make the component data itself data-oriented

**Confidence: high.**

`Transform2D` contains two `TransformState2D` objects, each containing two `Vec2` objects
(`src/engine/src/components/transform/transform2d.ts:5-34`). Source construction therefore creates seven objects
per transform: one component, two states, and four vectors. A cached `WorldTransform2D` adds a similar nested
representation. Iteration is dense in component references, but reading transform fields still pointer-chases
through multiple objects.

The same pattern is less severe but still present in conveyors: each `ConveyorBeltComponent` owns four ordinary
arrays for two lanes and their progress (`src/app/client/src/components/conveyor-belt.ts:31-47,79-94`).

This does not justify converting every component to typed arrays. It identifies transforms and high-volume item
state as candidates if browser profiles confirm them.

### F4 — World-transform maintenance performs global scans and rebuilds structural adjacency every sync

**Confidence: high for work/allocation; medium for dominance.**

Every sync:

1. clears shared scratch structures;
2. scans all `Parent` components and rebuilds `CHILDREN_BY_PARENT`;
3. scans all `WorldTransform2D` values for stale entries;
4. copies every `Transform2D` ID into scratch;
5. checks every transform for dirtiness, including component lookups and, for parented entities, transform
   composition; and
6. syncs dirty subtrees (`src/engine/src/systems/worldTransform2D.ts:39-46,65-145`).

Although the Map is reused, `target.set(parent.entityId, [entityId])` creates one child array per distinct parent
per sync (`src/engine/src/systems/worldTransform2D.ts:65-78`). If 500k items are distributed eight per belt, the
source-visible estimate is about 62.5k new arrays per sync just for this adjacency rebuild. The estimate assumes
each item has `Parent` + `Transform2D` and each belt is a distinct parent.

The scratch ID arrays and Sets are reused, which is good. The child arrays are not.

### F5 — Conveyor simulation avoids many value allocations, but the chain iterator exposes O(belts) objects

**Confidence: high at source level; medium for actual GC due possible JIT scalar replacement.**

The conveyor system wisely reuses the iterator, motion utility, deferred array, and sync Set
(`src/app/client/src/systems/world/conveyor-entity-motion/index.ts:12-23`). Slot-position and transform scratch
objects are also shared (`ConveyorEntityMotionUtils.ts:29-31`, `:316-354`).

However, `ConveyorBeltChainIterator.next()` constructs a new `{done, value}` object on every yield and termination
(`src/app/client/src/entities/transport-belt/topology/ConveyorBeltChainIterator.ts:38-65`). The system traverses
each chain twice (`conveyor-entity-motion/index.ts:34-40`). A chain of N belts therefore exposes `2N + 2`
source-level `IteratorResult` allocations per update: approximately 1,000,002 for a 500k-belt chain. A browser
allocation profile must determine how many survive JIT escape analysis.

Side-load candidates can additionally allocate a transfer object (`ConveyorSideLoadUtils.ts:59-63`), option
objects, and predicates (`TransportBeltGridQuery.ts:65-92`), but only for eligible leaf paths; these should not be
multiplied by all items without a measured scenario.

The larger simulation cost is work, not allocation: every animated chain is advanced and then traversed again to
sync item transforms. Each occupied slot may perform ECS transform access and mutation
(`ConveyorEntityMotionUtils.ts:316-354`).

### F6 — Renderer extraction is not primarily suffering from ECS query-result allocation

**Confidence: high for code path.**

Sprite extraction uses `world.forEach(Sprite, ...)` and `world.forEach(AnimatedSprite, ...)`, so it avoids query
result arrays (`src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/index.ts:47-59`).
It still visits every sprite, performs cache and transform lookup, and queues every visible record
(`queue-sprites/manager.ts:75-118`). That is renderer extraction/visibility work, not a reason to replace ECS query.

The renderer already pools commands and scratch arrays (`src/engine/src/core/allocator/Allocator.ts:34-77`) and
persists per-entity sprite records in a Map (`queue-sprites/cache.ts:79-98`). First sight of a sprite creates a
cache entry plus a record containing nested sprite/tint/transform objects. Counting explicit constructors and
object literals gives roughly 11 persistent JavaScript objects per cached sprite record, plus Map storage
(`sprite-render-record.ts:33-53`, `queue-sprites/cache.ts:89-97`). This is retained memory, not per-frame garbage.

The same entity ID is represented in the world's Set, global generations Map, each component's dense/sparse
storage, and the render cache. These are functional indexes, but their combined retained memory must be measured
at target scale.

### F7 — Structural operations have global component/parent costs, but are not proven frame bottlenecks

**Confidence: high for complexity, low for runtime importance without churn.**

Destroying one entity scans every component store (`src/engine/src/ecs/world.ts:327-345`) and first rebuilds a
complete parent adjacency Map using iterator tuples (`world.ts:347-395`). `ComponentStore`'s generator yields a
new `[entityId, component]` tuple for each entry (`src/engine/src/ecs/storage.ts:119-129`). Moving entities likewise
scans every component store (`world.ts:492-520`).

These are poor high-churn behaviors but should not be prioritized above per-update work unless stress profiles
show frequent spawn/despawn/move.

## Problem separation

| Cause | Evidence | What it is not |
| --- | --- | --- |
| Entity count | All-transform snapshot and world-transform scans scale with total matching entities. ID space nearly ends at 1M. | Proof that ECS must be replaced. |
| Component layout | Transforms are nested object graphs; sparse membership uses Maps. | A renderer upload problem. |
| Query design | `query` copies IDs; query-then-get repeats Maps; `forEach` is already cheaper. | The cause of sprite extraction, which uses `forEach`. |
| Renderer extraction | Every Sprite/AnimatedSprite is visited; cache records and commands are produced for visible entries. | Query-result allocation. |
| Simulation design | Conveyors traverse chains twice and synchronize entity transforms slot-by-slot. World transforms rebuild adjacency. | Draw-call cost or GPU upload cost. |

## Recommendations

### 0. Fix the entity-ID capacity model before claiming 1M support

Add index reuse with a free list and validate generation semantics, or deliberately widen/change the ID
representation. Define whether the budget is per world, simultaneous globally, or process lifetime. Add a
capacity test containing visible entities plus realistic supporting entities. This is prerequisite correctness,
not an optimization.

### 1. Use component-bearing direct iteration in measured hot loops

Start with `transformSnapshotSystem`: replace query-then-get with existing `forEach1`, preserving behavior. Audit
other per-update query loops the same way. This is a small change using an existing API and needs no query cache.
Where arity exceeds three, add only the concrete direct-iteration primitive demonstrated by a hot profile.

Do not cache arbitrary query arrays first. Correct invalidation on add/remove/move increases complexity and keeps
large ID arrays resident.

### 2. Stop reconstructing transform hierarchy state every update

Maintain parent→children adjacency on structural `Parent` add/remove/change, or at minimum reuse child-array
capacity safely instead of discarding every array on `Map.clear`. Then track dirty local transforms/parent changes
so clean transforms do not require full stale recomposition. Measure each step separately; adjacency persistence
removes allocations, while dirty indexing removes CPU scans.

### 3. Validate and remove iterator-protocol garbage from conveyor traversal

Use an allocation profile first. If `IteratorResult` objects appear, replace the iterator-protocol loop with an
imperative linked traversal or a specialized chain visitor that does not construct a result object per belt.
Preserve the required advance-before-sync ordering unless tests prove fusion is safe.

Separately measure occupied slots versus empty belts. The current design does fixed eight-slot inspection per belt
and ECS transform mutation per carried item, so "500k entities" is insufficient workload description.

### 4. Introduce packed storage only for confirmed high-volume fields

Good candidates are:

- transform current/previous scalar fields;
- world-transform cache fields;
- conveyor item lane/slot/progress, or a more compact item path/distance representation.

For common stores, an integer sparse-index typed array can avoid Map nodes and map lookup overhead. For rare
components, a 1M-entry sparse typed array costs roughly 4 MiB per store at 32 bits even when almost empty, so keep
a hybrid strategy. Benchmark actual density before choosing.

### 5. Keep ECS, simulation, and renderer optimizations independent

- ECS: avoid result arrays and redundant component lookup.
- Simulation: avoid global transform/hierarchy work and per-belt iterator objects.
- Renderer: reduce visits, record construction, packing, and upload independently.

Persistent GPU buffers will not remove conveyor simulation or world-transform costs. Conversely, packed ECS
fields will not remove renderer visibility iteration or uploads.

### 6. Add stage-specific production telemetry before larger redesign

Record candidate count, result count, time, and allocation/GC for transform snapshot, world transform,
conveyor advance, conveyor transform sync, sprite extraction, batch packing, and upload. Include:

- total entities and each relevant component count;
- belts, occupied slots, chain count, and chain-length distribution;
- parent count and distinct parent count;
- visible versus culled sprites;
- structural changes per update.

Without these denominators, a 500k result cannot distinguish layout, simulation, and rendering.

## Rejected assumptions

- **“The sparse-set ECS is inherently the bottleneck.”** Dense iteration and smallest-store selection are sound,
  and the existing `forEach` path is efficient enough to test before replacement.
- **“Map membership is proven to dominate.”** The benchmark combines result construction, membership, and
  component retrieval; only an application CPU profile can attribute exact shares.
- **“All iterator object literals become garbage.”** The source exposes them, but JIT escape analysis may remove
  some. Heap allocation profiling is required.
- **“Typed arrays everywhere will be smaller.”** They help common dense scalar components but waste fixed sparse
  capacity on rare component types.
- **“Renderer batching solves ECS/simulation scaling.”** Sprite extraction already uses allocation-free ECS
  iteration, while transforms and conveyor simulation remain separate CPU work.
- **“The benchmark RSS delta is the engine's entity footprint.”** It is a synthetic-process observation and is
  unsuitable for production memory budgeting.
- **“Structural destroy/move paths are hot.”** Their global scans are real, but no churn measurement establishes
  priority.

## Unanswered questions

1. Does the production browser allocate `IteratorResult` objects for conveyor traversal, or scalar-replace them?
2. What are the update-order and dirty-rate distributions for `Transform2D` and `WorldTransform2D`?
3. How many visible entities are belts, items, decorations, helpers, and other objects at each stress target?
4. What is the belt occupancy, chain-length, leaf-count, and side-load distribution?
5. Are item entities required for gameplay identity, or can large populations use packed belt/path state while
   retaining entities only where interaction requires them?
6. How much retained heap belongs to component objects, sparse Maps, global generations, render-cache records,
   commands, and GPU-side buffers in a production build?
7. How much entity churn occurs per update, and can IDs be reused immediately subject to generation safety?
8. Do any systems depend on stable dense-array order across swap-remove operations?

## Confidence level

- **High** for storage/query control flow, the entity-ID ceiling, source-visible
  allocation sites, and current transform/conveyor traversal shapes.
- **Medium** for the relative extracted-algorithm benchmark results.
- **Unknown in the real browser workload** for absolute ECS frame cost,
  allocation survival, GC impact, and memory capacity.

## Conclusion

The evidence does not justify replacing the ECS. The smallest path is to fix the near-1M ID-capacity defect, use
the existing direct component iteration in hot loops, persist transform hierarchy structure, and verify
conveyor-iterator allocations. Packed storage should follow only for measured high-volume fields. Renderer work
must remain a separate investigation because sprite extraction already avoids ECS query-result allocation.
