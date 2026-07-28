# 19 - Worker Belt Simulation and Rendering Stress Demo

## Status

Phase-one implementation available in `BeltStressScene`. Open it from the scene switcher or with
`?benchmark=belts&benchmarkTarget=50000`.

The scene is intentionally disposable. It establishes a measurable packed worker/render boundary; it is not a
production belt simulation or a replacement for the normal scene.

## Purpose

Build an isolated benchmark scene that tests whether a headless belt simulation can run in a Web Worker while the
main thread renders 50,000-100,000 moving items without creating an ECS entity per simulated item.

The experiment must answer these questions independently:

1. How much of the current cost comes from ECS mutation and render projection?
2. How expensive is publishing packed simulation state from a worker?
3. How expensive is uploading only moving positions to WebGL?
4. Can belt sprite animation remain entirely GPU-driven after initial upload?
5. At what population, movement ratio, and publication rate does CPU-to-GPU upload become the limiting cost?

This is not intended to replace the existing stress profiler. It adds a purpose-built comparison against its
object-based ECS workload.

## Baseline behavior that motivated the experiment

### Belt animation

Before the retained-animation change, transport belts used `AnimatedSprite` with 16 asset IDs, tick playback, and
a shared global animation offset. The animation advances one frame every two update ticks.

The previous retained sprite projection:

- scans every animated sprite on every render,
- derives its current frame asset ID on the CPU,
- marks it dirty when the frame changes,
- includes the frame asset ID in its retained bucket key,
- removes the belt from the previous-frame bucket,
- inserts it into the new-frame bucket,
- repacks the complete retained instance record,
- and uploads the resulting dirty range before drawing.

The texture sheet itself is deduplicated and remains GPU-resident. The unnecessary churn is in CPU sampling,
bucket membership, instance packing, and instance-buffer upload.

Belts now opt into shader-selected animation. Their instances remain retained, and a draw-bucket uniform selects
the sprite-sheet frame from the engine update tick. A belt is reprojected only when its component data is marked
dirty; ordinary animation no longer scans the belt, migrates it between frame buckets, repacks its record, or
uploads its instance data.

### Moving item records

The retained sprite layout currently contains 19 `Float32` values, or 76 bytes:

| Values | Field |
|---:|---|
| 2 | previous position |
| 2 | current position |
| 2 | size |
| 1 | rotation |
| 2 | anchor |
| 2 | flip scale |
| 4 | UV rectangle |
| 4 | tint |

A position-only change still repacks, compares, and writes all 19 values. GPU dirtiness is represented by one
minimum-to-maximum slot range, so scattered changes can also upload unchanged records between the changed slots.

The current stress profile places static and moving sprites into different retained buckets, so it does not upload
the static half when the moving half changes. It does, however, upload the full 19-float record for essentially
every member of the moving bucket.

### Belt draw fragmentation baseline

Belts now occupy one dedicated render layer and do not use per-world-Y `zOrder`. Other sprite types retain the
general ordering model.

## Implemented phase one

The current demo implements:

- 10k, 50k, 100k, and 500k item targets;
- a headless deterministic Web Worker with no ECS or renderer dependency;
- static belt positions transferred once per configuration;
- three pooled transferable item-position buffers with a latest-wins presentation queue;
- configuration generations so buffers from an old population cannot enter a new pool;
- two renderer-owned GPU position buffers, with only the new XY page uploaded after the initial pair;
- display-rate interpolation between the previous and current position buffers;
- one shader-timed belt draw and one item draw;
- worker simulation time, skipped publications, upload time/bytes, draw submission time, frame interval, draw
  count, and checksum metrics;
- a browser harness at `window.__BELT_STRESS_BENCH__`.

The phase-one worker generates straight two-lane belt rows with deterministic wraparound motion. It deliberately
does not yet implement occupancy blocking, curved networks, sources/sinks, insert/remove churn, SharedArrayBuffer,
or GPU timer queries. Those remain comparison variants below rather than claims of the current demo.

## Core hypothesis

The target architecture should separate three forms of data:

1. **Simulation state**: compact authoritative belt/item data owned by the worker.
2. **Stable presentation state**: material, texture, UV rules, size, belt geometry, and stable instance slots.
3. **Dynamic presentation state**: only values that must change for the selected rendering technique.

For the initial experiment, moving items publish positions. Belts publish no ordinary animation updates after
creation. A later experiment may publish parametric item state instead of positions.

## Proposed runtime shape

```text
Main thread                                  Simulation worker
-----------                                  -----------------
input/configure  --------------------------> allocate packed simulation
static belt/item GPU buffers <-------------  creation payload, once
                                             fixed-tick belt simulation
dynamic position buffer      <-------------  packed position publication
WebGL interpolation + draw
global belt animation uniform
metrics/controls             <-------------> tick, checksum, timing, sequence
```

The WebGL context remains on the main thread for this experiment. Retained GPU resources belong exclusively to
the renderer and do not need to be shared with the simulation worker.

## Headless simulation requirements

The worker simulation must not import or depend on:

- `Registry`,
- ECS components,
- engine execution context,
- DOM APIs,
- render components,
- WebGL types.

It should use fixed-capacity or explicitly grown typed-array storage. The simulated behavior should preserve the
important belt semantics needed for a representative load:

- two lanes,
- finite occupancy,
- deterministic advancement,
- blocking behind occupied destinations,
- transfer between belt segments,
- straight and curved path support,
- closed networks or deterministic sinks/sources so the population remains stable,
- fixed integer ticks,
- a deterministic checksum.

The worker does not need to reproduce the current class and entity representation. It needs equivalent observable
item flow for performance comparison.

## Scene workload

Create a dedicated scene rather than modifying the existing benchmark scene. The scene should provide:

- 10,000, 50,000, 100,000, and 500,000 item targets,
- enough generated belts to hold the selected population,
- deterministic serpentine or closed-loop belt networks,
- camera controls comparable to the normal scene,
- configurable simulation publication rates of 10, 20, 30, and 60 UPS,
- configurable render target or display-rate rendering,
- pause, reset, and deterministic seed controls,
- visible worker/main-thread health and staleness metrics.

The 500,000 target is an investigative ceiling, not an initial acceptance gate. A one-million target should only
be introduced after the lower populations have useful phase-level measurements.

## Renderer layout

### Belt buffer

Upload belt instance data once:

- world position,
- variant or sprite-sheet row,
- size,
- layer/order representation,
- any curve/path descriptor required by item rendering.

Ordinary belt animation should update only a uniform such as:

```text
animationFrame = floor(presentationTick / ticksPerFrame) % frameCount
```

The vertex or fragment shader derives the frame UV column from that value and the stable variant row. No belt
instance buffer should be updated during ordinary animation.

### Item static buffer

Upload on creation or structural visual change:

- stable slot identity,
- item type/material,
- size,
- UV rectangle or atlas index,
- tint if required.

### Item dynamic buffers

Compare both layouts:

1. Four-float records containing previous and current XY.
2. Two renderer-owned position buffers where previous/current roles are swapped and only the new current XY is
   uploaded.

The two-float variant is the preferred bandwidth ceiling:

| Total items | Moving items | Current 19-float upload | Four-float upload | Two-float upload |
|---:|---:|---:|---:|---:|
| 100,000 | 50,000 | 3.8 MB/tick | 0.8 MB/tick | 0.4 MB/tick |
| 500,000 | 250,000 | 19 MB/tick | 4 MB/tick | 2 MB/tick |

These are payload sizes, not predicted frame times. The experiment must measure driver cost and total frame
impact rather than assuming performance scales exactly with bytes.

### Slot stability

Static and dynamic buffers must use coordinated stable slots. Creation/removal may update both buffer classes,
but position publication must not rewrite static attributes. The benchmark should test both no-churn and controlled
insert/remove workloads.

## Worker transport variants

Implement and measure transport in this order:

1. Pooled transferable `ArrayBuffer` position pages.
2. Double- or triple-buffered `SharedArrayBuffer` pages with an atomic generation header.
3. Optional parametric item records for a procedural-motion ceiling.

Transfer mode must return consumed buffers to the worker pool so it does not allocate a new page each tick.

Both modes require a latest-wins policy:

- simulation publications must not build an unbounded message queue,
- the renderer consumes the newest complete generation,
- stale intermediate generations may be dropped,
- skipped generations and presentation staleness must be measured.

Shared memory removes worker-to-main transfer/copy cost. It does not remove the main-thread WebGL upload.

## Comparison matrix

### Pipeline variants

1. Existing ECS stress profile with the current 19-float retained layout.
2. Existing ECS projection with split static and four-float dynamic buffers.
3. Direct packed main-thread belt simulation and packed renderer.
4. Worker simulation with pooled transferable position pages.
5. Worker simulation with shared position pages.
6. Worker simulation with two-float GPU position-buffer ping-pong.
7. GPU-timed belt animation with zero ordinary belt-instance uploads.
8. Optional parametric item presentation with no per-tick position publication.

### Population and movement

- Populations: 10k, 50k, 100k, 500k.
- Moving ratios: 0%, 1%, 10%, 50%, 90%, 100%.
- Position dirtiness: contiguous slots and randomly scattered slots.
- Churn: none, then 1% insert/remove per second.
- Visual changes: isolate UV, tint, material, and size changes from transform changes.

### Rates

- Simulation/publication: 10, 20, 30, 60 UPS.
- Render: display refresh and a controlled cap where supported.
- Belt animation: current CPU-selected frame baseline versus GPU uniform.

## Required measurements

### Worker

- simulation tick average, median, p95, p99, and maximum,
- ticks completed and missed,
- state packing time,
- publication time,
- bytes published per tick,
- buffers allocated/reused,
- deterministic checksum.

### Main thread

- message transit latency or shared-generation latency,
- consumed and dropped publications,
- presentation staleness in ticks and milliseconds,
- render-source processing time,
- CPU packing/comparison time,
- `bufferSubData` calls and bytes,
- draw calls,
- render-pass CPU time,
- RAF average, median, p95, p99, and maximum,
- long tasks and heap/GC behavior.

### GPU

- GPU draw time when timer queries are supported,
- item and belt instance counts,
- buffer allocation/reallocation count,
- texture/material switches,
- evidence of hardware-backed WebGL.

Frames produced and frames actually presented must remain separate metrics.

## Correctness checks

Performance results are invalid unless the demo also verifies:

- identical worker checksums for identical seeds and commands,
- item conservation across transfers,
- no lane overwrites or duplicate occupancy,
- correct blocking and unblocking,
- render generation never reads a buffer while it is being written,
- interpolated positions remain within their belt path,
- belt animation remains synchronized with the selected presentation tick,
- transfer and shared-memory modes produce equivalent sampled positions.

## Decision gates

### Gate A: packed renderer without workers

Determine whether removing ECS projection and splitting static/dynamic buffers materially reduces CPU time and
GPU upload cost. Do not attribute an improvement to workers before this baseline exists.

### Gate B: transferable worker

Demonstrate bounded queues, buffer reuse, deterministic simulation, and useful 50k/100k frame pacing. Record the
actual transfer and staleness cost.

### Gate C: shared memory

Add shared pages only if Gate B shows transfer/ownership exchange is material. Compare against the same simulation,
renderer, population, and publication rate.

### Gate D: procedural presentation

Compare position publication with belt-segment/lane/progress records or another analytical representation. This
establishes whether ordinary movement can avoid position uploads, especially for distant or high-density views.

## Expected architectural conclusions

The experiment should confirm or reject these expectations:

- moving current ECS work to a worker without changing representation is insufficient,
- retained rendering remains viable because GPU ownership stays with one renderer,
- belt animation should require only a global time/tick uniform after initial upload,
- static/dynamic instance separation belongs to the render-source and renderer layout rather than generic ECS
  field annotations,
- position-only uploads should be substantially cheaper than the current 19-float path,
- ECS mutation and projection may remain more expensive than the reduced GPU upload,
- a million simulated items will still require visibility/LOD or procedural presentation rather than a mandatory
  million-item per-tick render snapshot.

## Non-goals

- Replacing the production belt simulation during the experiment.
- Moving WebGL into an `OffscreenCanvas` worker.
- Creating one worker or one WebGL context per land claim.
- Designing the final networking protocol.
- Treating the benchmark's packed representation as a public engine API before results exist.
- Adding generic ECS field-level static/dynamic metadata before renderer evidence justifies it.

## Likely implementation sequence

1. Add phase-level metrics required by the experiment.
2. Add the dedicated scene and deterministic generated workload.
3. Implement the packed headless simulation on the main thread.
4. Implement static belt/item buffers and split dynamic position buffers.
5. Implement GPU-timed belt animation.
6. Capture the packed main-thread baseline.
7. Move the unchanged simulation runner into a worker.
8. Add pooled transferable pages and latest-wins publication.
9. Capture 50k and 100k results.
10. Add shared pages only if the transfer measurements justify them.
11. Test procedural item presentation.
12. Compare the results with the existing ECS stress profiler before proposing production APIs.
