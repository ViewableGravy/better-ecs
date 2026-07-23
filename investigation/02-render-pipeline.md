# Render Pipeline Investigation

## Scope

This report traces the active sprite path at commit `3f8b91e` from ECS storage to the WebGL draw call:

```text
ComponentStore
→ UserWorld.forEach(Sprite / AnimatedSprite)
→ whole-world selection
→ per-entity transform lookup and culling
→ persistent SpriteRenderRecord cache
→ frame-local render commands and buckets
→ Renderer2D interpolation and texture lookup
→ reusable 17-float-per-instance CPU array
→ full gl.bufferData upload
→ gl.drawArraysInstanced
```

It also traces conveyor-carried item motion into that path and assesses the renderer-specific experiments required by
the investigation brief.

This is a read-only code investigation. No production code, instrumentation, shaders, or benchmark harnesses were
changed. Networking was not inspected.

## Method

1. Followed the client render pipeline registration and pass execution order.
2. Traced the sprite and animated-sprite queue loops into their persistent record cache, visibility test, command
   creation, bucket insertion, render dispatch, CPU instance packing, WebGL upload, and draw.
3. Searched globally for dirty-record consumers, WebGL partial-update APIs, instance-slot ownership, and instanced draw
   calls to distinguish implemented functionality from suggestive names.
4. Traced carried gears from conveyor-owned lane state through update-time rail calculation, `Transform2D` mutation,
   parent/world-transform propagation, and the ordinary sprite path.
5. Cross-checked historical browser results in `docs/RENDERING_50K_120FPS_ROADMAP.md` and
   `docs/RENDERING_1M_ENTITY_AUDIT.md` against current code. Those results are explicitly labelled historical because
   their Chrome trace artifact is not retained in the repository and the referenced benchmark scene is not present in
   current source.
6. Quantified transfer size from the actual 17-float instance format. These byte figures are arithmetic estimates, not
   measured bus bandwidth or GPU time.

## Evidence

### 1. Entity/component storage

`World` owns a `Set<EntityId>` and a `Map<Function, ComponentStore>` (`src/engine/src/ecs/world.ts:266-269`).
Each `ComponentStore` uses:

- dense JavaScript arrays for component objects and entity IDs; and
- a `Map<number, number>` from entity index to dense index

(`src/engine/src/ecs/storage.ts:9-13`).

The one-component `forEach1` fast path reads the dense entity and component arrays and invokes the supplied callback
once for every stored component (`src/engine/src/ecs/world.ts:608-627`). This avoids allocating a query result array,
but it does not create or cache a spatially restricted set.

Transforms are object graphs: a `Transform2D` contains `curr` and `prev` objects, each containing position and scale
`Vec2` objects (`src/engine/src/components/transform/transform2d.ts:5-34`). A separate `WorldTransform2D` component is
maintained by the transform system. That system scans all `Parent`, all `WorldTransform2D`, and all `Transform2D`
components to build scratch state and find dirty transforms (`src/engine/src/systems/worldTransform2D.ts:39-46`,
`65-105`). Render reads the cached world component through a sparse lookup
(`src/engine/src/ecs/hierarchy.ts:30-35`).

### 2. Pipeline and world visibility

The client creates `Renderer2D(WebGLRenderAPI)` and supplies `ActiveWorldProvider`
(`src/app/client/src/render/index.ts:13-33`). Each rendered frame:

1. calculates interpolation alpha;
2. calls `worldProvider.getVisibleWorlds()`;
3. clears the command queue;
4. resets allocator pools; and
5. executes world-scoped passes once per visible world

(`src/engine/src/core/render-pipeline/create.ts:164-212`).

`ActiveWorldProvider` selects whole spatial-context worlds and may add a transition world
(`src/app/client/src/render/world-provider.ts:7-23`). It does not select entities, chunks, or render slots within a
world. It also materializes the manager's visible-world iterator with `[...manager.getVisibleWorlds()]`
(`src/app/client/src/render/world-provider.ts:15`).

The world render pass queues every renderable category, renders the commands, then clears the queue
(`src/engine/src/core/render-pipeline/passes/render-world/index.ts:12-23`).

### 3. Render query and extraction

`queueSprites()` performs two full dense scans per visible world:

- every `Sprite`; and
- every `AnimatedSprite`, followed by a `world.has(entityId, Sprite)` check

(`src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/index.ts:47-59`).

Because `AnimatedSprite extends Sprite` at the TypeScript/class level but is stored under the constructor supplied to
the ECS, the explicit second component-store scan is the active polymorphism mechanism. No render query includes
visibility, transform, region, or dirty components.

For each sprite, `QueueSpriteEntityManager.queue()`:

1. performs a `Map` lookup in a persistent per-world record cache;
2. performs a sparse ECS lookup for `WorldTransform2D`;
3. attempts static-record reuse;
4. otherwise compares/copies sprite, tint, and transform fields;
5. calculates visibility;
6. appends the record to a frame scratch array; and
7. creates a frame command and inserts it into the render queue

(`src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/manager.ts:75-119`).

The cache is genuinely persistent at the CPU object level: it is a `WeakMap<UserWorld, state>` whose state contains a
`Map<EntityId, CachedSpriteRenderRecord>` (`queue-sprites/cache.ts:17-20`, `36-40`, `147-160`). A newly seen entity
allocates a nested record containing a `SpriteRenderState`, `Rgba`, and `Transform2D`
(`queue-sprites/cache.ts:79-98`; `render-world/sprite-render-record.ts:33-53`).

The cache does not eliminate traversal. `cache.beginFrame()` increments a serial, both component stores are still
scanned, every encountered entity updates `lastSeenSerial`, and pruning separately scans 64–4096 cache entries
(`queue-sprites/index.ts:28-30`, `47-63`; `queue-sprites/cache.ts:109-145`).

#### Static versus dynamic record work

`Sprite.isDynamic` defaults to `true` (`src/engine/src/components/sprite/sprite.ts:120-143`), and every
`AnimatedSprite` is forced through the dynamic path regardless of that property
(`queue-sprites/manager.ts:121-132`, `177-188`).

A static record can skip sprite/tint field comparisons, but only after:

- the entity was visited;
- the cache map was queried;
- `WorldTransform2D` was fetched;
- the record's cohort and periodic revalidation state were checked; and
- ten current/previous transform scalars were compared

(`queue-sprites/manager.ts:121-175`, `198-208`).

Even a reused, visible static record is appended to the frame array and gets a render command
(`queue-sprites/manager.ts:162-172`).

The normal path compares 13 sprite/tint values and ten transform values before updating version counters and a
two-bit dirty mask (`queue-sprites/writers.ts:11-77`, `80-130`). A repository-wide use search shows
`spriteVersion`, `transformVersion`, and `dirtyMask` are only used to maintain the record/cohort; they are not consumed
by `Renderer2D` or `WebGLRenderAPI`. Therefore they currently reduce some CPU record copying, not instance packing or
GPU transfer.

Animated sprites sample their frame asset per entity per render from time or update tick
(`queue-sprites/index.ts:31-33`, `53-59`; `src/engine/src/components/sprite/animated/utility.ts:19-63`). Transport belts
are animated sprites with 16 frame asset IDs and global tick offset
(`src/app/client/src/entities/transport-belt/render/createTransportBeltSprite.ts:6-35`).

### 4. Visibility and culling

Culling is per sprite and occurs inside extraction, after the renderer has visited the sprite and fetched its cached
world transform (`queue-sprites/manager.ts:81-99`). Invisible sprites avoid the record-array append, command allocation,
texture lookup, typed-array packing, upload bytes, and draw instances, but they do **not** avoid:

- the full `Sprite`/`AnimatedSprite` store scans;
- cache lookup and serial update;
- world-transform lookup;
- dynamic sprite/tint/transform comparisons; or
- the culling calculation itself.

Static entries also remain subject to the initial traversal and transform comparison. When the culling signature
changes, the culling test runs again (`queue-sprites/manager.ts:148-155`). The signature contains interpolation alpha as
well as camera bounds (`queue-sprites/utility.ts:47-58`), so a stationary camera does not guarantee a stable signature
between render frames while alpha advances.

The sprite culling test interpolates world position, computes `sin`/`cos`, and constructs a temporary viewport object
for every tested sprite with non-zero dimensions
(`render/culling/utils.ts:205-230`, `337-374`). Thus culling itself currently allocates an object per evaluated sprite.

`RenderVisibility` is not a renderer selection component. It stores a role and base alpha
(`src/app/client/src/components/render-visibility.ts:19-31`), and there is no reference to it under the engine render
pipeline. It must not be mistaken for a spatial visibility index.

**Answer:** current culling reduces extraction, command, packing, transfer, and draw-instance work for rejected
sprites, but only after total sprite traversal and significant per-entity CPU work.

### 5. Batch and command construction

For each visible sprite, `queueSpriteCommand()`:

- acquires a pooled command;
- writes world/entity/order fields;
- allocates/interpolates the key string ``sprite:${assetId}``; and
- inserts the command into nested scope/layer/sub-layer/material maps

(`queue-sprites/utility.ts:7-30`; `src/engine/src/render/queue/render-queue.ts:102-114`).

Render commands themselves are pooled and reset (`src/engine/src/render/frame-allocator/engine-registry.ts:72-99`).
The frame scratch arrays are also retained and length-reset (`src/engine/src/core/allocator/Allocator.ts:34-52`).
These are useful foundations.

The bucket structures are not retained across frames. `RenderQueue.clear()` clears all scope layer maps and the ordered
bucket list (`src/engine/src/render/queue/render-queue.ts:138-151`), so the next visible command recreates layer,
sub-layer, four bucket-group objects/maps, material bucket, and command arrays as needed
(`render/queue/render-queue.ts:194-247`, `249-270`). `insertNumericKey` and `insertRenderBucket` use array `splice`
(`render/queue/render-queue.ts:273-300`).

Commands are dispatched with a nested bucket/command loop (`render-world/render/render-commands.ts:66-123`). The sprite
path reuses the extracted transform, but still performs an `EditorHoverHighlight` sparse ECS lookup for every visible
sprite before calling `renderer.renderSprite`
(`render-world/render/handlers/sprite-entity.ts:26-54`).

`Renderer2D` then performs, per sprite:

- asset-ID map lookup;
- handle-to-image map lookup;
- interpolation of X/Y;
- copy into one shared `SpriteRenderData` object; and
- a virtual/API call to `drawSprite`

(`src/engine/src/render/renderers/renderer2d.ts:283-345`;
`src/engine/src/render/textureCache/texture-cache.ts:117-194`, `241-245`).

### 6. Typed-array construction

`WebGLRenderAPI` retains a growable CPU `Float32Array`, initially sized for 1,024 instances
(`src/engine/src/render/renderers/webGL/api.ts:24-42`). It is a capacity buffer, not persistent render state.

For every visible sprite, `#queueSprite()`:

- looks up/creates a WebGL texture;
- may flush when texture identity changes;
- computes screen-space centre, size, UVs, and flip values;
- writes 17 scalar floats into the next sequential slot; and
- increments the active count

(`webGL/api.ts:160-221`).

`#worldToScreen()` returns a fresh `{x, y}` object for every sprite (`webGL/api.ts:605-618`). When capacity grows, a
new doubled `Float32Array` is allocated and the entire previous capacity is copied (`webGL/api.ts:266-275`). After
capacity stabilizes, the backing array is reused, but its active prefix is overwritten from slot zero every frame.

The actual instance format is:

| Attribute | Floats |
| --- | ---: |
| centre | 2 |
| size | 2 |
| rotation | 1 |
| anchor | 2 |
| flip/scale signs | 2 |
| UV rectangle | 4 |
| tint | 4 |
| **Total** | **17** |

The matching vertex attributes and 68-byte stride are configured in
`src/engine/src/render/renderers/webGL/registry/programs/sprite.ts:29-74`.

At 500,000 visible instances, one full active prefix is:

- 8,500,000 floats;
- 34,000,000 bytes; or
- approximately 32.4 MiB.

That is also at least 8.5 million JavaScript scalar typed-array writes before submission. If a single such batch were
rebuilt at 60 FPS, its nominal submitted payload would be 2.04 GB/s; at 120 FPS, 4.08 GB/s. These figures do not
measure driver copies or hardware bandwidth and must not be presented as GPU timing.

### 7. GPU upload

The sprite program creates one long-lived WebGL instance buffer object (`registry/programs/sprite.ts:21-29`).
However, each flush calls:

```ts
gl.bufferData(
  gl.ARRAY_BUFFER,
  this.#spriteBatchData.subarray(0, count * 17),
  gl.DYNAMIC_DRAW,
);
```

(`src/engine/src/render/renderers/webGL/api.ts:223-241`).

Therefore:

- the **buffer handle** persists;
- the **instance contents and storage specification** are replaced for the complete active batch;
- a new `subarray` view is produced per flush;
- there is no `bufferSubData`;
- there are no byte or slot dirty ranges; and
- record dirty bits cannot reduce upload volume.

Texture changes flush the current batch (`webGL/api.ts:169-176`). Custom textured quads, camera changes, mesh-overlay
state changes, clear, shapes, and end-of-frame also call the flush path (`webGL/api.ts:101-127`, `146-158`, and the
other `#flushSpriteBatch()` call sites). Consequently, draw count is the number of consecutive texture runs plus
pipeline interruptions, not simply the number of render-queue buckets or unique assets.

The texture manager caches a `WebGLTexture` by source object (`webGL/gpu-texture-manager.ts:3-31`), so texture images
sharing a source can batch even when their frame UVs differ. Whether a particular asset sheet shares one source is an
asset-layout fact, not guaranteed by `assetId`.

### 8. Draw call

Each flush issues one:

```ts
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);
```

(`src/engine/src/render/renderers/webGL/api.ts:243-264`).

The vertex shader calculates per-vertex anchor, flip, rotation, viewport conversion, and UV interpolation from the
already packed instance transform (`src/engine/src/render/renderers/webGL/shaders/sprite.vert:4-41`). It does not
receive simulation time, belt/path ID, lane, progress, belt speed, or parent/belt geometry.

Instancing is therefore a real draw-call optimization. It is not currently an iteration, extraction, packing,
simulation, or transfer optimization.

## Conveyor Item Path

### Authoritative state

A belt owns two four-entry entity-ID arrays and two four-entry progress arrays, plus topology, variant, and speed
(`src/app/client/src/components/conveyor-belt.ts:31-94`). A carried item is also an ordinary ECS entity. For gears, that
means at least a `Transform2D`, `Sprite`, `RenderVisibility`, and `Debug`; the gear sprite is marked static
(`src/app/client/src/entities/gear/index.ts:22-38`).

`ConveyorUtils.addEntity()`:

1. calculates a local rail position;
2. parents the item entity to the belt;
3. adds a local `Transform2D`; and
4. records entity ID and progress in the belt slots

(`src/app/client/src/entities/transport-belt/ConveyorUtils.ts:21-58`).

This duplicates carried-item location in two forms:

- belt lane/slot/progress ownership; and
- the item's local/current/previous transform plus derived world transform.

### Simulation cost

On every conveyor update, the system starts from every leaf belt, walks each chain once to advance occupancy and again
to synchronize carried-item transforms (`src/app/client/src/systems/world/conveyor-entity-motion/index.ts:25-47`).

For each occupied slot, transform synchronization:

- derives a rail position from variant, lane, slot, and progress;
- looks up the item `Transform2D`; and
- calls tracked `mutate(transform, "curr", ...)` if position changed

(`src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts:316-354`).

`mutate` checks serialization metadata and notifies tracked-field mutation
(`src/engine/src/serialization/mutate.ts:35-58`). The world-transform system then separately scans transform/parent
storage and updates the item's `WorldTransform2D` (`src/engine/src/systems/worldTransform2D.ts:39-46`, `108-165`).

Straight rails use linear interpolation; curves resolve a descriptor, calculate centre/radius, and use
`hypot`, `atan2`, `sin`, and `cos` (`src/app/client/src/entities/transport-belt/motion/BeltItemRailsUtility.ts:20-103`).
These are fixed-update simulation/presentation-preparation costs, not GPU draw-call costs.

On a transfer, lane arrays/progress and the item's `Parent` are changed, with extra world-position preservation work
(`ConveyorEntityMotionUtils.ts:373-409`, `447-494`). Occupancy, blocking, side-loading, and transfer decisions remain
legitimate CPU simulation responsibilities.

### Render cost

After simulation, each carried gear is indistinguishable from a general sprite:

1. it is visited in the complete `Sprite` scan;
2. its cached world transform is looked up and compared;
3. culling evaluates the interpolated transform;
4. a record and command are appended if visible;
5. texture metadata is looked up;
6. its interpolated position and all other instance fields are repacked; and
7. its full 68-byte instance record participates in the next `bufferData`.

Marking the gear `isDynamic = false` only enables record-comparison reuse between updates. It does not supply a stable
GPU slot or avoid render-frame repacking/upload.

## Findings

### Finding 1 — Current batching primarily reduces draw calls

The renderer can draw many consecutive same-texture sprites with one instanced call. It still does CPU work
proportional to all sprite components plus additional work proportional to visible sprites:

| Cost class | Current scaling |
| --- | --- |
| ECS/render query | all `Sprite` + all `AnimatedSprite` components in every visible world |
| Culling | every traversed sprite after cache and transform access |
| Record extraction | every dynamic/revalidated sprite |
| Command and renderer dispatch | every visible sprite |
| Typed-array construction | all 17 fields for every visible sprite |
| CPU-to-GPU transfer | complete active data for every batch |
| Draw calls | consecutive texture runs and interruptions |
| Conveyor simulation | leaf/chain/slot traversal on fixed updates, independent of draw batching |

These costs must be measured separately. A low draw-call count would not prove an efficient frame.

### Finding 2 — “Persistent” exists at three levels, but not where it avoids transfer

Implemented:

- persistent per-entity CPU record objects;
- pooled per-frame command objects and scratch arrays;
- a reusable growable CPU typed array; and
- a persistent WebGL buffer handle.

Missing:

- stable entity/render-source → instance-slot ownership;
- persistent valid instance contents across frames;
- active/free slot management;
- compact active ranges;
- partial range upload;
- dirty range coalescing;
- sparse structural add/remove/move events; and
- static/dynamic GPU data separation.

The existing `dirtyMask` is not a GPU dirty mechanism.

### Finding 3 — Static caching does not make static sprites cheap enough at very large visible counts

Static caching can avoid repeated sprite/tint field comparisons. It cannot avoid the total scan, transform access and
comparison, culling when the alpha-sensitive signature changes, visible command construction, texture lookup,
instance packing, or complete upload.

A more meaningful static/dynamic separation would retain stable material/UV/size/tint and stable slots, while updating
only dynamic transform channels. Even that must be validated against the cost of fragmented attributes and extra
draw/buffer binding.

### Finding 4 — Current culling is late with respect to traversal

It is early enough to save command/render/upload/draw work, but too late to make a huge mostly-off-screen world cheap.
The engine has whole-world visibility only; it has no spatial render index, chunk render source, or visibility-driven
ECS subset. Culling cannot reduce the initial total `Sprite`/`AnimatedSprite` traversal in the present architecture.

### Finding 5 — Conveyor visual position is derivable from more stable data

For a carried item, the current CPU rail function already proves the necessary visual position is a deterministic
function of:

- belt/path variant (prefer a compact path ID, not a string);
- lane;
- slot plus progress, or an equivalent base distance;
- parent belt world transform;
- item sprite/material;
- reference deterministic simulation tick and optional render interpolation
  alpha;
- belt/lane speed; and
- blocked/running state.

Straight and quarter-turn paths are analytically representable. The GPU could calculate local path position and then
apply the belt transform. CPU simulation would continue to own occupancy, transfers, side-loads, and blocking.

The smallest credible experiment is not “move the conveyor system to the GPU.” It is an aggregate carried-item render
source whose instances contain stable path/material data plus reference progress/tick. A test shader samples visual
progress. Structural events update belt/path ownership; simulation corrections and catch-up ticks update the
authoritative reference as required.

### Finding 6 — Shader-derived movement can reduce presentation work, but only under an extrapolation contract

If simulation rewrites base progress for every moving item on every fixed update, nearly all item slots remain dirty.
Persistent buffers plus `bufferSubData` would then save allocation/orphaning patterns but might not materially reduce
transfer or CPU iteration.

To gain more, the renderer needs a contract such as:

```text
visualDistance(renderTick, interpolationAlpha) =
  baseDistanceAtReferenceTick
  + speedPerTick * (renderTick - referenceTick + interpolationAlpha)
```

until a structural or state-change event (transfer, blockage, unblocking, speed/path change, spawn/despawn) supplies a
new reference. This makes deterministic tick progression, not per-frame transform mutation or a second wall clock,
drive smooth presentation. Every catch-up tick still runs authoritative CPU simulation before the shader presents
the resulting state.

This contract needs correctness work at congestion boundaries. The GPU must not visually pass a blocked item or
cross a belt transfer before the simulation authorizes it. One practical approach is to clamp against a
simulation-authored maximum distance or update the affected local chain when blocking changes. That is an experiment,
not a conclusion from current measurements.

### Finding 7 — Animated belts are also always dynamic

Every belt samples an asset frame and is forced through the dynamic record path each render even though its world
transform, dimensions, and most material state are static. If frames are on a shared texture source, a frame index/UV
could be shader-derived from the deterministic simulation tick plus optional render interpolation while retaining
stable instance geometry. This is distinct from carried-item movement and should be benchmarked independently.

### Finding 8 — Current evidence does not isolate GPU capability

Historical dev-server measurements report an all-visible 500,000-entity steady-state frame average of approximately
440 ms / 2.27 FPS after queue-time culling work (`docs/RENDERING_50K_120FPS_ROADMAP.md:343-381`). Earlier record-staging
results were approximately 431 ms / 2.32 FPS (`docs/RENDERING_50K_120FPS_ROADMAP.md:294-318`).

The historical trace summary attributes large sampled self-time to ECS `get`, WebGL `#queueSprite`, and sprite command
handling (`docs/RENDERING_50K_120FPS_ROADMAP.md:19-37`), and its Stage C conclusion says high-count frames remained
dominated by CPU queue/staging rather than GPU submission (`docs/RENDERING_50K_120FPS_ROADMAP.md:377-381`).

Limitations:

- the run used `client:dev`, not a production build (`docs/RENDERING_50K_120FPS_ROADMAP.md:343-349`);
- the trace file named by the document is not in the repository;
- upload and draw were not isolated;
- the current source no longer contains the referenced benchmark scene; and
- the current branch has changed since the March 2026 measurement.

It is therefore evidence that the old/current-family full path fails at 500k and was CPU-heavy, **not** evidence that
the GPU cannot draw 500k prepared instances.

## Renderer Primitive Audit

| Primitive | Status | Evidence / implication |
| --- | --- | --- |
| Instanced sprite draw | Present | `drawArraysInstanced`, `webGL/api.ts:254` |
| Persistent WebGL buffer handle | Present | created once, `registry/programs/sprite.ts:21-29` |
| Persistent buffer contents | Absent | complete `bufferData` per flush, `webGL/api.ts:236-241` |
| Reusable CPU capacity array | Present | `#spriteBatchData`, `webGL/api.ts:40`, `266-275` |
| Stable render slots | Absent | active data appended from index zero; count reset at `262-263` |
| Partial buffer updates | Absent | no `bufferSubData` in engine source |
| Dirty ranges | Absent | record bits stop before renderer |
| Structural add/remove events | Absent | renderer rediscovers sprites by full scans |
| Sparse updates | Absent | no slot lookup/update API |
| Compact active ranges | Absent | only one transient active prefix per texture run |
| Static/dynamic GPU separation | Absent | all 17 floats interleaved and rewritten |
| Spatial pre-traversal culling | Absent | selection granularity is whole world |
| GPU interpolation of entity transforms | Partial | rotation is shader-side; X/Y are CPU-interpolated |
| GPU conveyor path animation | Absent | shader has no path/lane/progress/time inputs |
| Aggregate high-cardinality render source | Absent | one entity → one command → one packed instance |
| Upload/draw telemetry | Absent | no timer queries or per-stage counters in active API |

## Required Renderer Experiments

The experiments below should be run in both development and production unless the row says otherwise. Browser-level
results belong in `01-browser-performance.md`; this table defines the renderer seams and what is currently missing.

| Required experiment | Possible without production changes? | Current blocker / minimum harness primitive | Metric |
| --- | --- | --- | --- |
| 1. Iterate entities without rendering | Partly | `forEach` can be called, but the current app has no maintained large-count benchmark scene or render-disable stage toggle. A test scene can time fixed dense scans with rendering paused. | CPU time, allocation, scaling by total vs visible |
| 2. Draw a fixed prebuilt instance buffer without rebuilding | No through renderer API | Upload once, retain count/texture/VAO, and expose a test-only `drawPreparedSpriteInstances()` that issues only uniforms/bind/draw. | CPU submit time and GPU timer query |
| 3. Rebuild instance data without uploading | No | Packing is private and fused to submission. Extract a benchmark-only pure pack loop or add an upload-suppression test hook. | CPU pack time and allocations |
| 4. Upload a full instance buffer without ECS traversal | No | Test-only low-level upload entry taking an already populated `Float32Array`; optionally orphan + `bufferSubData` variants. | JS call duration, GPU/driver timing, bytes |
| 5. Update a small percentage of instance slots | No | Stable slots plus `bufferSubData`/mapped dirty ranges are absent. Prototype an isolated slot buffer; do not retrofit ECS first. | dirty collection, calls, bytes, GPU stalls |
| 6. Update nearly all instance slots | No | Same prototype as #5, with 90–100% dirty. Compare coalesced subdata with full orphan/upload. | crossover percentage and stalls |
| 7. Draw 500k simple instances | Not in isolation | Current public path necessarily traverses, packs, and uploads. Use experiment #2 with one texture and overlays/non-sprite passes disabled. | GPU time, draw CPU submit time, FPS |
| 8. Cull before ECS/render traversal | No for one large world | No spatial sprite index/chunk render source. Prototype a prebuilt visible chunk/source list and compare total-store scan versus visible-chunk iteration. | entities visited, cull cost, end-to-end extraction |
| 9. CPU item positions vs shader-derived positions | No | Add an isolated aggregate conveyor-item buffer and experimental vertex shader with path ID/lane/base distance/reference time/speed. Keep authoritative simulation unchanged. | update CPU, render CPU, bytes, GPU time, visual error |
| 10. Development vs production | Yes at application level | Historical data is dev-only. The browser investigation must run identical committed scenarios from dev and production builds. | full stage breakdown and frame variance |

### Experimental controls

For each experiment:

- keep texture count, viewport, camera, visible count, canvas resolution, and overlay/debug settings fixed;
- disable mesh outlines because `#drawSpriteBatchOverlay()` loops over every instance and draws additional geometry
  (`webGL/api.ts:256-258`, `278+`);
- report total sprites, visible sprites, packed instances, uploaded bytes, upload calls, and draw calls;
- use `EXT_disjoint_timer_query_webgl2` where available for GPU time rather than treating JavaScript call duration as
  draw time;
- warm textures and buffers before samples;
- exclude spawn/capacity-growth frames from steady-state but report their hitches separately;
- test at least one texture and a controlled multi-texture sequence;
- test static, fixed-update moving, and structurally changing instances separately; and
- include 100k, 250k, 500k, and 1M where hardware and browser stability permit.

## Recommended Future Changes

These are recommendations for later implementation, ordered to preserve causal measurement.

1. **Add isolated low-level renderer benchmarks first.** Establish prepared-draw, pack-only, upload-only, small-dirty,
   and nearly-all-dirty tests. Until these exist, GPU capability and the partial-update crossover cannot be known.
2. **Add counters before redesign.** Count total sprite visits, cull accepts/rejects, static-cache hits, commands,
   packed instances, floats/bytes submitted, upload calls, and draw calls. Use GPU timer queries in the benchmark
   harness.
3. **Remove per-frame bucket reconstruction where measured.** Retain material/layer bucket topology or let persistent
   render sources submit directly. Do not begin with a new general abstraction; first verify bucket construction is
   material in a current production trace.
4. **Prototype persistent stable slots in isolation.** Add generation-safe slot allocation, free-list reuse, compact
   active ranges, and coalesced dirty intervals for one sprite material. Compare small and nearly-all dirty workloads.
5. **Connect dirty state to submission only if the experiments win.** Current record dirty bits should either drive
   actual buffer updates or be removed/simplified; maintaining versions that no downstream stage consumes adds work
   without reducing transfer.
6. **Separate stable and changing data after measuring layouts.** Candidate stable fields are UV, anchor, size, tint,
   material/path ID, lane, and parent/belt reference. Candidate dynamic fields are position/progress and occasional
   tint/visibility. Compare interleaved versus split buffers.
7. **Add spatial/chunk render sources for large mostly-invisible worlds.** Visibility must select sources before
   entity traversal. This should complement, not substitute for, the prepared 500k visible draw experiment.
8. **Prototype conveyor aggregate rendering.** Read belt-owned occupancy directly into stable item slots; leave
   collision/occupancy/transfer simulation on CPU. First compare CPU-calculated packed positions with shader-derived
   positions under the same authoritative simulation.
9. **Use event-driven reference updates for shader movement if correctness permits.** Update an item's reference data
   on spawn, transfer, block/unblock, speed/path/material change, and correction. If congestion requires nearly all
   items to update every tick, record that result and do not claim persistent buffers solve transfer.
10. **Consider GPU-derived belt animation separately.** A deterministic simulation tick plus frame/UV selection could
    prevent every animated belt from being treated as a fully dynamic sprite, provided texture-source/atlas layout
    supports it.

## Smallest Likely Sequence

The smallest evidence-driven sequence for meaningful renderer improvement is:

1. isolated prepared draw/pack/upload experiments;
2. counters and production trace of the unchanged full path;
3. remove measured per-sprite allocations (`#worldToScreen` and culling viewport) as low-risk baseline work;
4. prototype stable slots + dirty range upload for one material;
5. choose full upload versus partial update from the measured dirty-percentage crossover;
6. add pre-traversal chunk/source visibility if normal scenes are mostly culled; and
7. add an aggregate, shader-sampled conveyor-item path only if conveyor items remain a dominant cost.

This sequence deliberately leaves the general ECS, conveyor authority logic, and general sprite API intact until an
isolated result justifies a broader change.

## Explicitly Rejected Assumptions

1. **“Instancing means the renderer is efficient.”** Rejected. It proves draw-call reduction only.
2. **“The buffer is persistent because `WebGLBuffer` is created once.”** Rejected. Complete active contents are
   supplied again with `bufferData` on every flush.
3. **“Dirty masks enable partial GPU updates.”** Rejected. No renderer code consumes them.
4. **“Static sprites are not rebuilt.”** Rejected. Their records may be reused, but visible instances are still
   dispatched, packed, and uploaded.
5. **“Culling avoids iterating off-screen entities.”** Rejected. Per-entity culling happens after full component-store
   traversal and transform access.
6. **“500k at ~2.3 FPS proves the GPU cannot draw 500k.”** Rejected. The historical benchmark measured the fused
   dev full path, not a prepared GPU draw.
7. **“Persistent buffers solve conveyors.”** Rejected without a dirty-rate experiment. If every item reference changes
   each tick, most data may still be transferred.
8. **“Shader movement removes simulation work.”** Rejected. Occupancy, blocking, transfers, collision, and authority
   remain CPU work; shader movement can remove presentation transform calculation/repacking only.
9. **“Entity count itself is the cause.”** Rejected. Current per-entity stages include sparse lookups, object field
   comparisons, culling math/allocation, commands, asset lookup, packing, transfer, and draw; each must be isolated.
10. **“`RenderVisibility` is a culling index.”** Rejected. The active renderer does not query it.
11. **“A large renderer rewrite is already justified.”** Rejected. The current evidence strongly identifies fused
    CPU work but lacks prepared-buffer, upload-only, and GPU-only measurements.

## Confidence Level

| Conclusion | Confidence | Reason |
| --- | --- | --- |
| Exact active sprite path and full-batch upload behavior | High | Direct line-level trace and global API-use search |
| Culling occurs after total sprite traversal | High | Direct control-flow evidence |
| No stable slots, partial uploads, dirty ranges, or path shader | High | Direct structure/API search |
| Conveyor item transforms are CPU-derived then rendered as general sprites | High | Direct simulation and render trace |
| Stable conveyor data can analytically derive visual position | High for feasibility | Current CPU function already derives it from those inputs |
| Shader extrapolation will improve end-to-end performance | Medium/unknown | Depends on blocking corrections, dirty rate, and measured stage dominance |
| Full path is CPU-heavy at 500k | Medium | Historical documented measurement matches current-family structure, but raw trace and current benchmark scene are absent |
| GPU can or cannot draw 500k prepared instances acceptably | Unknown | Required isolated experiment has not been performed |
| Partial update crossover | Unknown | Required stable-slot experiment has not been performed |

## Unanswered Questions

1. What are current production-build times for ECS traversal, culling/extraction, command construction, packing, upload,
   JavaScript draw submission, and GPU execution at each target count?
2. Can the target hardware draw 500k prepared simple sprites at the required frame rate with one texture?
3. How many texture runs and pipeline interruptions occur in a representative conveyor-heavy scene?
4. What fraction of visible sprites are rejected by culling, and what fraction of the world is spatially irrelevant?
5. At steady state, what percentage of carried items are moving, blocked, transferring, spawning, or despawning per
   simulation tick?
6. At what dirty percentage does coalesced `bufferSubData` become slower than full orphan/upload on target browsers and
   GPUs?
7. Do current sheet frame assets share a WebGL texture source consistently enough for effective batching and shader
   frame selection?
8. Can conveyor visual extrapolation be bounded without visible overlap or premature transfer under blockage?
9. Does the game truly require 500k individually distinguishable carried items, or can distant items use a coarser
   aggregate representation?
10. How much fixed-update time is separately spent in conveyor chain traversal, rail geometry, tracked transform
    mutation, and world-transform synchronization?
11. How much garbage is attributable to per-sprite culling viewport objects, `#worldToScreen` objects, bucket topology,
    key strings, and typed-array subarray views?
12. Is ordering by world-Y-derived `zOrder` visually required for carried items and belts, and how would stable
    material slots preserve that ordering without fragmenting draws?
