# Structural Strengths and Weaknesses Investigation

## Scope

This report identifies the architectural foundations that should survive future performance work and the structures
that obstruct scale or make ownership difficult to reason about. It covers ECS storage and iteration, engine and scene
lifecycle, update/render separation, transform propagation, render extraction and batching, conveyor-item motion,
profiling seams, determinism, allocations, copying, and unsupported abstraction.

This is a read-only assessment of commit `3f8b91e`. No production code, instrumentation, or benchmarks were changed.
Networking was excluded.

The central conclusion is:

> The codebase does not justify a wholesale rewrite. Its phase boundaries, sparse-set iteration, render-pass model,
> pooling utilities, and instanced WebGL path are useful foundations. The scale blockers are concentrated in the
> representations and work performed *inside* those boundaries: global scans, object-heavy duplicated transforms,
> cross-cutting mutation tracking, rebuilt render queues, and full instance repacking/upload.

## Method

1. Traced ownership from `EngineClass` through `SceneManager`, `SceneContext`, `UserWorld`, and `World`.
2. Traced lifecycle ordering for engine systems, scene systems, render passes, scene transitions, and frame allocators.
3. Traced high-cardinality data through component storage, transform derivation, sprite extraction, render records,
   command buckets, typed-array packing, GPU upload, and instanced draw.
4. Traced conveyor lane state through topology iteration, progress updates, item transform synchronization, dirty
   serialization, and ordinary sprite rendering.
5. Searched for retained pools/scratch objects, persistent caches, process-wide singletons, unused metadata, duplicate
   implementations, broad traversal, and source-visible allocations.
6. Cross-checked the completed render-pipeline, ECS/allocation, defensive-complexity, and complexity-reduction reports
   after forming the findings independently. The cross-check found no contradiction; this report does not substitute
   their measurements for direct evidence.

No new runtime timings are claimed here. “Hot” means structurally per update, per rendered frame, or per entity.
Browser profiles remain necessary to rank the CPU and GPU costs.

## Architectural map

```text
EngineClass
├─ SystemsManager → ordered engine and scene update systems
├─ SceneManager → active scene/context/world routing
├─ RenderManager → RenderPipeline
│  ├─ explicit frame/world passes
│  ├─ reusable RenderQueue + FrameAllocator
│  └─ Renderer2D → WebGLRenderAPI → instance buffer → drawArraysInstanced
└─ EngineSerializationManager → global component/structural mutation tracking

World
├─ Set<EntityId>
└─ Map<ComponentType, ComponentStore>
   ├─ dense entity array
   ├─ dense component-reference array
   └─ sparse Map<entityIndex, denseIndex>
```

The top-level ownership names are mostly clear. Ambiguity appears below them because a `World` can have multiple
`UserWorld` wrappers, active-world selection crosses several managers, and `World`/`Component` mutation reports
through a process-global engine rather than an owner reference.

## Evidence: foundations worth retaining

### S1 — Retain the sparse-set shape and direct component-bearing iteration

**Confidence: high.**

`ComponentStore` uses aligned dense entity/component arrays, sparse O(1) membership, and swap removal
(`src/engine/src/ecs/storage.ts:9-35`, `86-117`). `World.query` correctly selects the smallest component store before
intersecting other stores (`src/engine/src/ecs/world.ts:522-605`). `forEach1/2/3` goes further: it walks dense arrays
directly, chooses the smaller candidate store for two- and three-component intersections, and supplies component
values without materializing a query-result array (`world.ts:608-753`).

These are sound primitives. Replacing the entire ECS would discard a useful dense-iteration and sparse-membership
foundation before browser evidence shows it is necessary.

What is *not* established by this design is fully packed component data. Components remain object references and the
sparse side is a JavaScript `Map`; for example, `Transform2D` owns two state objects and four nested `Vec2` objects
(`src/engine/src/components/transform/transform2d.ts:5-34`). Retain the store/query contract while allowing selected
high-volume components to gain a more data-oriented representation if measurements justify it.

### S2 — Retain explicit update/render phases and render-pass lifecycle

**Confidence: high.**

The engine schedules update systems and rendering separately, sets an explicit phase, and executes each under an
engine/scene context (`src/engine/src/core/engine/index.ts:195-234`, `265-304`). Rendering has explicit begin-frame,
camera, world, and end-frame passes; frame passes run once while consecutive world passes run per visible world
(`src/engine/src/core/render-pipeline/create.ts:131-154`, `164-212`). Renderer begin/end and allocator begin/end are
therefore visible lifecycle boundaries rather than implicit side effects
(`passes/begin-frame.ts:7-13`, `passes/end-frame.ts:4-9`).

This separation is valuable for profiling and experimentation: simulation-only, extraction-only, upload-only, and
draw-only work can be isolated without redesigning the whole engine. The pass list is also a reasonable extension
point as long as unsupported pass variants do not accumulate.

### S3 — Retain manager-owned lifecycle boundaries

**Confidence: high.**

`SystemsManager` instantiates scene systems once per engine, sorts them once, initializes them once per scene
activation, and cleans them up at teardown (`src/engine/src/core/engine/systems/index.ts:13-23`, `49-100`).
`SceneManager.set` rejects overlapping transitions and brackets setup/teardown with an explicit transition state and
`try/finally` cleanup (`src/engine/src/core/scene/scene-manager.ts:153-191`). It clears old worlds after scene teardown
and constructs the new world/context before setup (`scene-manager.ts:246-289`). `RenderManager` likewise separates
initialization, texture warmup, and rendering (`src/engine/src/core/render-pipeline/manager.ts:3-34`).

These boundaries are more useful than moving lifecycle back into a large `EngineClass`. Future simplification should
narrow the number of world authorities, not flatten all managers into one module.

### S4 — Retain pooling, scratch reuse, and the instanced sprite primitive

**Confidence: high.**

`Allocator` retains pooled values and scratch arrays, resetting cursors/lengths rather than recreating the values
(`src/engine/src/core/allocator/Allocator.ts:3-77`). Render commands and several render-data records have concrete pool
factories (`src/engine/src/render/frame-allocator/engine-registry.ts:17-151`). Conveyor motion similarly reuses its
iterator, motion helper, deferred-transfer array, sync set, position vector, and parent transform scratch
(`src/app/client/src/systems/world/conveyor-entity-motion/index.ts:12-23`;
`src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts:29-31`, `316-354`).

The WebGL renderer already uses a growable retained `Float32Array` and one instanced draw for a same-texture sprite
batch (`src/engine/src/render/renderers/webGL/api.ts:24-42`, `160-264`). This is a genuine batching primitive worth
keeping. It reduces draw calls and provides a direct seam for fixed-buffer, partial-upload, and prebuilt-buffer
experiments.

The important qualification is that the current primitive is a transient batch, not persistent render storage.
Every active instance is rewritten and the full active prefix is uploaded with `gl.bufferData` on every flush
(`webGL/api.ts:201-240`).

### S5 — Retain the persistent sprite-record concept, not all current cache metadata

**Confidence: high.**

`SpriteRenderRecordCache` maintains per-world, per-entity render records in a `WeakMap<UserWorld, state>` and prunes
unseen entries incrementally (`src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/cache.ts:17-20`,
`36-47`, `79-160`). The record separates renderer-facing sprite/transform data from direct ECS reads
(`render-world/sprite-render-record.ts:10-31`). This is the beginning of stable render ownership and should not be
deleted merely because the surrounding queue rebuild is expensive.

However, `spriteVersion`, `transformVersion`, and dirty-mask metadata have no GPU or partial-upload consumer. Writers
maintain them (`queue-sprites/writers.ts:11-130`), but the active renderer still packs and uploads every visible record.
Retain stable per-entity records; delete or replace speculative metadata only when the persistent-buffer contract is
defined.

### S6 — Retain deterministic ordering and explicit stepping seams, but do not call the runtime fully deterministic

**Confidence: high for ordering; medium-high for cross-runtime determinism.**

Systems are sorted once by numeric priority and then run with ordinary indexed/ordered loops
(`src/engine/src/core/engine/systems/index.ts:20-23`, `111-113`;
`src/engine/src/core/engine/index.ts:291-300`). `Meta.updateTick` is explicit, transform history is snapped in a
built-in engine system, world transforms run at a deliberately very low scene priority, and tests can drive one
update with `stepUpdate` (`engine/index.ts:237-263`; `src/engine/src/systems/transformSnapshot.ts:5-33`;
`src/engine/src/systems/worldTransform2D.ts:28-36`).

These are useful determinism/testability seams. They do not form a fixed-accumulator simulation: `DeltaState` runs at
most one update when elapsed time crosses a tolerance and stores the wall-clock delta
(`src/engine/src/core/engine/delta/index.ts:23-47`). Animated sprite selection also samples `performance.now()`
(`queue-sprites/index.ts:31-33`).

The future direction is now confirmed: simulation will use deterministic ticks,
normally advancing once per frame and executing additional ticks to catch up to
the authoritative server tick when behind. Preserve ordered ticks and
`stepUpdate` for that migration. This investigation did not design or measure
the tick scheduler, catch-up budget, replay contract, deterministic RNG, or
render interpolation.

### S7 — Retain opt-in instrumentation seams, but replace the current measurements

**Confidence: high.**

The FPS plugin records FPS/UPS histories and exposes target-rate controls (`src/libs/fps/src/index.ts:15-67`;
`src/libs/fps/src/render.ts:21-96`). Render-command traversal has an opt-in window flag and accumulated samples
(`src/engine/src/core/render-pipeline/passes/render-world/render/render-commands.ts:26-45`, `186-249`).

The opt-in approach is a useful facility. The current queue tracer, however, times a second command-counting traversal
after rendering rather than the actual dispatch, packing, upload, or draw (`render-commands.ts:131-134`, `194-221`).
FPS-derived frame time also cannot separate CPU, GPU, or GC. Keep the toggles and reporting seam; replace their
contents with stage timings and browser/GPU evidence.

## Findings: structural weaknesses and optimization blockers

| ID | Structure | Concrete evidence | Consequence | Confidence |
| --- | --- | --- | --- | --- |
| W1 | Non-reusing 20-bit entity IDs | `nextIndex` is monotonic, creation throws at `2^20`, and invalidation never returns an index (`src/engine/src/ecs/entity.ts:55-77`, `120-127`) | A 1M scenario nearly exhausts the process-lifetime ID space before belts, worlds, churn, or helper entities | High |
| W2 | Full-world transform maintenance | Each sync rebuilds parent adjacency, scans all cached world transforms, collects all local transforms, and checks each for dirtiness (`src/engine/src/systems/worldTransform2D.ts:39-145`) | “Dirty” derivation still costs broad traversal; one child array is allocated per parent each sync (`:65-78`) | High |
| W3 | Culling after broad traversal | `queueSprites` scans every `Sprite` and every `AnimatedSprite`; each is cache/transform looked up before culling (`queue-sprites/index.ts:47-59`; `queue-sprites/manager.ts:75-103`) | Off-screen entities avoid draw/upload but not ECS traversal and much extraction work | High |
| W4 | Rebuilt render ownership every frame | Queue clearing discards all layer/sub-layer/material maps and buckets (`src/engine/src/render/queue/render-queue.ts:138-151`); visible sprites acquire and repopulate commands (`queue-sprites/utility.ts:7-30`) | Persistent records are copied into transient command ownership every frame | High |
| W5 | Batching only reduces draw calls | WebGL packs 17 floats per visible sprite and uploads the full subarray with `gl.bufferData` (`webGL/api.ts:178-240`) | Draw-call count can be low while CPU packing and CPU→GPU transfer remain proportional to visible instances | High |
| W6 | Cross-cutting mutation tracking in hot state | `Transform2D.curr` is dirty-tracked by default (`transform2d.ts:23-33`; `serialization/state.ts:44-48`); carried items call `mutate` per changed transform (`ConveyorEntityMotionUtils.ts:332-353`), which serializes the nested field and enqueues a command (`serialization/mutate.ts:35-58`; `serializableComponent.ts:300-316`) | Simulation, persistence, and allocation costs are coupled; every visual position update can create serialized objects/arrays and string-keyed queue work | High |
| W7 | Multiple copies of high-volume transform/render state | Local `Transform2D`, derived `WorldTransform2D`, cached sprite-record `Transform2D`, 17-float batch data, and GPU buffer all represent related position/render state | Pointer chasing and repeated comparison/copying precede every draw; ownership of the authoritative visual state is unclear | High |
| W8 | Hidden process-global ownership | `registeredEngine`, mutable execution context, sprite-cache singleton, and queue-manager singleton are process-wide (`core/global-engine.ts:3-22`; `core/context.ts:21-89`; `queue-sprites/cache.ts:36-47`; `queue-sprites/manager.ts:21-72`) | Dependencies are temporal and implicit; isolation/testing and independent render pipelines are harder | High |
| W9 | Competing world wrappers/authorities | `SceneManager` owns a stable wrapper while `SceneContext` creates and registers wrappers for the same internal world (`scene-manager.ts:25-30`, `40-45`; `scene-context.ts:13-25`). Spatial focus then synchronizes through another manager and runtime system (`spatial-contexts/manager.ts:105-121`; `runtime.system.factory.ts:11-23`) | Active simulation world, context world, and render-visible worlds can be resolved through different paths | High |
| W10 | Object allocation in per-entity math | Culling constructs a viewport object (`render/culling/utils.ts:205-230`, `337-374`); WebGL world-to-screen returns a new point (`webGL/api.ts:605-618`) | Source-visible garbage scales with evaluated/drawn sprites even after command pooling | High at source level; runtime survival needs profiling |
| W11 | Defensive handling hides violated ownership | Dense iteration skips impossible holes (`ecs/world.ts:617-625`, `647-684`, `715-751`); missing carried-item transforms are ignored (`ConveyorEntityMotionUtils.ts:332-336`); invalid hierarchy paths become `false` (`ecs/hierarchy.ts:60-104`) | Invalid state becomes partial simulation/rendering and repeated checks rather than a boundary failure | High |
| W12 | Unsupported or duplicate abstraction remains | A second `RenderCommandRenderer` implementation is exported but has no production consumer (`render/render-commands/renderer.ts:39-253`; `render/render-commands/index.ts:1`). A legacy no-op render stage remains (`src/app/client/src/render/stages/RenderVisibleWorlds.ts:1-7`) | Competing code paths obscure which implementation owns behavior and make optimization changes riskier | High |
| W13 | Structural entity operations traverse globally | Destroying first builds a complete parent index and then scans every component store per removed entity (`ecs/world.ts:315-395`); moving scans every store (`world.ts:466-520`) | Churn cost is unrelated to the entity's actual component set and can become severe under streaming | High for mechanics; low/unknown current frequency |
| W14 | Profiling does not match optimization boundaries | Only aggregate FPS/UPS and an extra queue-count traversal are built in (S7) | The architecture cannot yet attribute time to simulation, extraction, packing, upload, draw, or GC without external/manual instrumentation | High |

### W1 is a correctness prerequisite, not a micro-optimization

Index zero is skipped, so the current lifetime capacity is 1,048,575 created IDs. Destroying an entity only increments
its generation; `nextIndex` continues forward. A “1M visible entities” test has fewer than 49k IDs left for belts,
cameras, hidden helpers, additional worlds, and all prior churn. This must be fixed or the target redefined before a
renderer result can establish 1M support.

### W2–W7 form the dominant structural data-movement chain

For a carried conveyor item, one update can:

```text
lane progress
→ compute rail position
→ mutate local Transform2D
→ serialize dirty Transform2D.curr
→ rebuild/check WorldTransform2D during a global sync
→ copy/compare into SpriteRenderRecord
→ append pooled command
→ interpolate and repack 17 floats
→ upload active batch prefix
```

Evidence spans `ConveyorEntityMotionUtils.syncLaneTransforms`
(`src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts:316-354`),
the transform sync (`src/engine/src/systems/worldTransform2D.ts:39-46`), sprite extraction
(`queue-sprites/manager.ts:75-118`), and WebGL packing/upload (`webGL/api.ts:160-264`).

Each stage has a defensible local purpose, but together they repeatedly project the same movement through object
representations. The future architecture should choose one authoritative simulation representation and one stable
render representation, with explicit dirty transfer between them.

### W8–W9 are ownership problems, not arguments against managers

The desired simplification is not “delete every manager.” The managers isolate responsibilities well at their public
boundaries. The problem is that state also lives in static singletons and parallel wrappers. A one-active-world design
would have one engine-owned simulation world reference and one render provider derived from `activeGameplaySpace`.
A retained multi-world design instead needs one explicit scheduler over `simulationSpaces`. Either is simpler than
keeping active/focused/default/visible authorities synchronized.

### W11 should be fixed at boundaries, not by deleting legitimate recovery

Missing loaded assets and asynchronous scene transitions are operational states and should retain handling.
Misaligned sparse-set arrays, a queued renderable without its required transform, or a carried slot referencing an
entity without the required transform are program-state violations. Future work should strengthen the type or assert
where ownership is established, then remove repeated inner-loop normalization.

## Retain, evolve, or remove

| Area | Direction | Reason |
| --- | --- | --- |
| `ComponentStore` dense/sparse API | **Retain and evolve** | Good iteration/membership shape; selectively improve sparse/component layout |
| `World.forEach1/2/3` | **Retain and prefer in hot loops** | Already avoids result copying and repeated component lookup |
| Engine update/render split | **Retain** | Essential profiling, interpolation, and test boundary |
| Render pass model | **Retain and narrow** | Clean experiment seam; avoid unused variants |
| Systems/scene/render managers | **Retain and narrow** | Clear lifecycle ownership; collapse competing world authorities |
| Frame allocator/pool registry | **Retain** | Concrete low-allocation primitive |
| Instanced sprite draw | **Retain and extend** | Good GPU primitive; needs stable slots/partial or prebuilt upload paths |
| Persistent sprite render record | **Retain and redefine** | Suitable CPU→GPU ownership boundary once a downstream dirty consumer exists |
| Conveyor fixed lane/slot semantics | **Retain initially** | Bounded, explicit domain state; replacement requires measured occupied-item workload |
| Conveyor two-phase advance then visual sync | **Retain until measured** | Encodes observable transfer/interpolation ordering; fusion needs evidence |
| Full-world transform scans | **Replace incrementally** | Persist adjacency and introduce structural/dirty indexes |
| Per-frame render command reconstruction for stable sprites | **Replace incrementally** | Stable render slots should own persistent commands/instance positions |
| Process-global queue manager/cache ownership | **Remove/narrow** | Put cache/queue state under the render pipeline/engine instance |
| Duplicate/legacy render implementations | **Delete after confirming no dynamic consumer** | They obscure the active path without current behavior |
| Automatic dirty serialization for every high-frequency visual mutation | **Split by policy/ownership** | Persistence should not tax purely derived or render-only state |

## Recommended future changes

These are intentionally incremental and ordered to preserve the good foundations.

### 0. Establish measurements at the existing boundaries

Instrument update systems, transform sync, sprite traversal/culling, record extraction, queue construction, float
packing, `bufferData`, draw submission, GC, and GPU completion separately. Retain the pass and phase model and add
profiling around it. Run fixed prebuilt-buffer and partial-dirty experiments before choosing a render redesign.

### 1. Fix entity lifetime capacity

Add index reuse with a free list and generation validation, or deliberately widen/change the ID representation.
Test target visible entities plus realistic belts, cameras, helpers, multiple setup/teardown cycles, and churn. This
change is independent of ECS replacement.

### 2. Remove proven hot-path waste using existing primitives

- Convert measured `query + get` loops, beginning with transform snapshotting, to `forEach`.
- Replace per-sprite culling/world-to-screen result objects with out-parameters or scalar code.
- Stop recreating stable material/layer bucket structure where a retained bucket can be reset by length.
- Remove unused render versions, flat queue views, duplicate renderer code, and no-op legacy stages only after the
  production-use search is repeated at implementation time.

### 3. Make high-frequency state ownership explicit

Classify fields as authoritative simulation state, persisted state, derived state, or render state. Do not run
derived item positions and derived world transforms through the same default dirty-serialization path as persistent
gameplay state. Keep structural create/add/remove tracking, but opt high-frequency derived fields out unless a real
consumer requires them.

### 4. Make transform work structural and dirty-driven

Maintain parent→children adjacency on `Parent` add/remove/change rather than rebuilding it. Track changed local
transforms and propagate only through affected subtrees. Keep `Transform2D`/`WorldTransform2D` APIs initially so this
can be verified independently before considering packed transform storage.

### 5. Introduce stable render slots behind the current renderer boundary

Give persistent sprite records stable batch/slot ownership. Compare:

- a prebuilt fixed instance buffer;
- sparse `bufferSubData` updates;
- dirty-range coalescing;
- compact active ranges after structural removal; and
- nearly-all-dirty fallback to one full upload.

Keep `Renderer2D`, the sprite shader, and instanced draw while testing. Do not assume partial updates help when
nearly every item moves.

### 6. Evaluate conveyor-specific rendering only after steps 0–5

The current lane/slot/progress model already exposes stable inputs: belt identity/variant, lane, slot, progress,
speed, and tick. If profiles show item transform propagation dominates, prototype shader-derived item position from
stable belt/path data. Keep authoritative lane occupancy and transfer logic on the CPU; avoid first replacing the
entire conveyor simulation.

### 7. Separate presented-space ownership from simulation-space scheduling

Model one `activeGameplaySpace` for presentation/local interaction and
`simulationSpaces` for every concurrently updated space. Then compare one
engine-owned ECS world with region membership against a minimal set of
explicitly scheduled ECS worlds. Remove the current focus/default/visible
authority overlap in either model. This is a complexity change and should not
be presented as a direct renderer speedup.

## Explicitly rejected assumptions

1. **“The ECS must be replaced.”** Rejected. Sparse-set iteration and smallest-store intersection are sound; layout
   and call-site costs can be improved independently.
2. **“The renderer already has a cache, so static sprites are cheap.”** Rejected. The cache avoids some field copies,
   but traversal, command creation, packing, and full upload remain.
3. **“Instancing proves rendering is efficient.”** Rejected. It proves draw-call batching, not low CPU extraction or
   low transfer volume.
4. **“Culling solves large inactive regions.”** Rejected for the current path. It rejects after whole-store traversal
   and transform/cache lookup.
5. **“Every object allocation identified here is a measured GC problem.”** Rejected. These are source-visible
   allocations; browser allocation profiles must determine survival and cost.
6. **“Persistent buffers automatically solve conveyor items.”** Rejected. If nearly every slot is dirty, partial
   updates may be worse than a full upload; shader-derived movement or a compact dynamic stream may be needed.
7. **“Update scheduling is already deterministic fixed-step simulation.”** Rejected. Ordering and a manual step seam
   exist, but wall-clock deltas and dropped catch-up ticks remain. A deterministic tick/catch-up migration is now a
   confirmed future direction, not current behavior.
8. **“Managers are the source of all complexity.”** Rejected. Their lifecycle boundaries are useful; parallel
   authorities and process-global state are the problem.
9. **“All defensive checks should be removed.”** Rejected. Loading, asset failure, and user-triggered transitions are
   operational. Only impossible owned-state checks should move to assertions/boundaries.
10. **“Conveyor lanes or linked topology should be redesigned immediately.”** Rejected. Their costs and occupied-item
    distribution must be measured; they also encode current transfer behavior.
11. **“Choosing one-world storage would remove spatial partitioning.”** Rejected. Regions/chunks inside one world
    remain valid tools for culling, loading, and simulation scale.

## Unanswered questions

1. At 100k/250k/500k/1M realistic entities, which is largest: transform sync, sprite traversal/culling, queue
   construction, float packing, GPU upload, draw, dirty serialization, or GC?
2. What fraction of target entities are visible, renderable, parented, moving, persisted, and conveyor-carried?
3. How many unique texture/layer/z-order buckets exist in the stress scene, and how often does texture switching
   split sprite batches?
4. How much of the dirty serialization workload is required for persistence, and which high-frequency fields can be
   derived on load instead?
5. Does the browser eliminate iterator/callback/object allocations, or do culling, conveyor iteration, and context
   selectors create material GC pressure?
6. Does a persistent instance buffer with 1%, 10%, 50%, and ~100% dirty slots outperform the current full
   `bufferData` path on target hardware?
7. Can conveyor item visuals be derived from belt/path identity, lane, base distance, speed, and simulation tick
   without breaking transfer interpolation at belt boundaries?
8. What tick rate, per-frame catch-up budget, interpolation behavior, input history, and RNG guarantees will the
   future deterministic scheduler require?
9. Should concurrently simulated gameplay spaces use one ECS world with
   render-facing regions/chunks, or several explicitly scheduled ECS worlds?
10. Are frequent entity destruction, world movement, and scene reload part of the scale workload? If not, W13 should
    remain behind per-frame work in priority.

## Overall confidence

**High** for ownership, traversal, allocation, copying, batching, and lifecycle mechanics because they are directly
visible in the active code paths. **Medium** for priority among CPU/GPU changes because this report did not collect
browser timings. The evidence strongly supports incremental consolidation around the existing good boundaries; it
does not support an indiscriminate rewrite.
