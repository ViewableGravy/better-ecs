# Serialization And Runtime Performance Investigation

## Scope

This investigation focused on the memory-allocation hotspots, GC spike sources, micro-stutters, and eventual tab-crash path introduced or amplified by the recent serialization work.

Primary goals:

- identify hot allocation paths
- explain minor and major GC behavior
- isolate the long-run crash trajectory
- benchmark the heaviest paths enough to prioritize fixes

I used three approaches:

1. code-path inspection of serialization, persistence, render, and conveyor systems
2. live Chrome heap and queue sampling against controlled scenes
3. temporary runtime counters added to the serialization manager and local-storage backend to measure command production versus consumption

## Important Constraint

Mid-investigation, the persisted scene state on this branch was overwritten by controlled repros, so later runs could not rehydrate the original built-in overworld transport demo exactly. Early measurements were taken before that happened and captured the original leak behavior. Later measurements used deterministic helper-generated scenes to reproduce the same classes of pressure.

This does not change the main conclusions. The root causes were still isolated in code and confirmed with runtime counters.

## Executive Summary

There are two separate but compounding problems.

### 1. Render-path serializable mutations create constant dirty-queue churn

The biggest non-conveyor-specific mistake is that render code mutates serializable fields every frame.

The clearest example is [src/app/client/src/render/passes/ApplyContextVisualsPass.ts](/workspaces/better-ecs/src/app/client/src/render/passes/ApplyContextVisualsPass.ts), which calls `mutate(...)` on:

- `Sprite.tint`
- `Shape.fill`
- `Shape.stroke`

Those fields are tracked by the serialization system, so every render-frame alpha/tint change becomes diff traffic.

This was confirmed live by pausing the engine update loop while leaving rendering active:

- heap stayed roughly flat
- engine diff queue still grew from about `221` to about `30,797` commands in `20s`

That means render-only visual interpolation is being treated as persistent game state.

### 2. Conveyor moving-item state generates extreme mutation volume, and the local-storage backend cannot keep up

The conveyor runtime stores moving item slots and slot progress on `ConveyorBeltComponent`, and those fields are serializable in [src/app/client/src/components/conveyor-belt.ts](/workspaces/better-ecs/src/app/client/src/components/conveyor-belt.ts).

That means normal belt animation generates serialization traffic for:

- `left`
- `right`
- `leftProgress`
- `rightProgress`
- tail-block flags
- linked-list adjacency changes in some cases

The active per-update mutators live in:

- [src/app/client/src/systems/world/conveyor-entity-motion/index.ts](/workspaces/better-ecs/src/app/client/src/systems/world/conveyor-entity-motion/index.ts)
- [src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts](/workspaces/better-ecs/src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts)
- [src/app/client/src/systems/world/conveyor-movement/index.ts](/workspaces/better-ecs/src/app/client/src/systems/world/conveyor-movement/index.ts)

The local-storage backend in [src/libs/state-sync/src/adapters/local-storage/backend/LocalStorageBackend.ts](/workspaces/better-ecs/src/libs/state-sync/src/adapters/local-storage/backend/LocalStorageBackend.ts) only processes commands within a `0.5ms` budget per run and deep-clones field payloads before eventually stringifying the entire snapshot in [src/libs/state-sync/src/adapters/local-storage/backend/storage.ts](/workspaces/better-ecs/src/libs/state-sync/src/adapters/local-storage/backend/storage.ts).

When command production exceeds that budget, the engine queue looks healthy because it drains into the backend, but the backend buffer grows silently and can become enormous.

That is the likely crash path.

## Key Measurements

### A. Original idle leak before the demo state was overwritten

With the original Main Scene transport demo content present and the game mostly idle:

- sample 1: heap climbed from about `433MB` to about `1.33GB` in `30s`
- sample 2: heap climbed from about `909MB` to about `1.89GB` in `30s`
- visible engine diff queue stayed at `0`
- placeable counts stayed flat

Interpretation:

- the ECS world was not obviously growing
- the engine queue was draining
- retained memory was accumulating somewhere downstream of the engine queue or outside ECS state entirely

### B. ECS world counts stayed flat while heap grew

Sampling the internal world stores showed stable counts while memory was climbing:

- entity count stayed at about `1301`
- component-store count stayed at `27`
- top component counts stayed unchanged across samples

Interpretation:

- the leak is not “more entities/components being spawned forever”
- retained growth is in runtime buffers, render/UI state, or other retained objects outside raw ECS counts

### C. Removing conveyor entities collapsed heap usage

After destroying all `ConveyorBeltComponent` entities from the live scene:

- entity count dropped from about `1301` to about `309`
- heap dropped from about `1.51GB` down toward `358MB`, then stabilized
- after resuming the engine, heap stayed healthy and even dropped as GC reclaimed memory
- diff queue remained `0`

Interpretation:

- conveyor runtime is the dominant amplifier for the long-run failure
- the general engine loop is not the main crash driver on its own

### D. Paused-mode split: render churn versus update churn

With belts present, pausing updates while leaving rendering active produced:

- heap roughly stable instead of runaway growth
- diff queue growth from about `221` to about `30,797` commands in `20s`

Interpretation:

- render passes create serialization traffic even with no simulation updates
- the large heap runaway is update-side and conveyor-driven
- the render serialization churn is still real and should be fixed first because it is a clear correctness issue

### E. Local-storage backend backlog under controlled moving-item stress

With a helper-generated belt scene carrying moving gears, the instrumented counters showed a major production/consumption mismatch.

One 5-second burst produced:

- engine serialization enqueued and drained about `11.18M` commands
- local-storage backend emitted about `11.17M` commands into its internal buffer
- local-storage backend processed only about `7.82M`
- local-storage backend retained about `3.35M` buffered commands
- processing time pinned at the full `0.5ms` budget
- flush duration reached about `8.04ms`

A smaller loop-driven sustained-motion repro produced:

- about `3.50M` emitted commands
- about `3.35M` processed commands
- about `142k` buffered commands left over
- flush duration about `7.76ms`

Interpretation:

- the backend is not sized for the mutation rate generated by moving conveyor state
- the engine diff queue is not the real indicator of health
- the real hidden backlog lives in `LocalStorageBackend.#commandBuffer`

## Main Hotspots

### Hotspot 1: Render-only visual state routed through serialization

Files:

- [src/app/client/src/render/passes/ApplyContextVisualsPass.ts](/workspaces/better-ecs/src/app/client/src/render/passes/ApplyContextVisualsPass.ts)

Why it is hot:

- every frame calls `mutate(...)` on serializable component fields
- these changes are ephemeral visual output, not durable game state
- they keep producing diff commands even when updates are paused

Effect:

- constant diff churn
- unnecessary allocations for serialized values and commands
- pressure on any persistence/network sink that consumes the queue

### Hotspot 2: Serializable conveyor slot/progress state updated as live animation state

Files:

- [src/app/client/src/components/conveyor-belt.ts](/workspaces/better-ecs/src/app/client/src/components/conveyor-belt.ts)
- [src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts](/workspaces/better-ecs/src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts)
- [src/app/client/src/systems/world/conveyor-entity-motion/index.ts](/workspaces/better-ecs/src/app/client/src/systems/world/conveyor-entity-motion/index.ts)

Why it is hot:

- live item movement updates serializable arrays and numbers continuously
- side-load and transfer logic can touch multiple belts per step
- every tracked field write becomes diff traffic

Effect:

- extremely high diff-command volume
- heavy allocation churn in queue and backend cloning paths
- dominant contributor to long-run crash behavior

### Hotspot 3: Local-storage backend deep-clones commands and falls behind under bursty workloads

Files:

- [src/libs/state-sync/src/adapters/local-storage/backend/LocalStorageBackend.ts](/workspaces/better-ecs/src/libs/state-sync/src/adapters/local-storage/backend/LocalStorageBackend.ts)
- [src/libs/state-sync/src/scene-state/serialize/serialize-value.ts](/workspaces/better-ecs/src/libs/state-sync/src/scene-state/serialize/serialize-value.ts)
- [src/libs/state-sync/src/adapters/local-storage/backend/storage.ts](/workspaces/better-ecs/src/libs/state-sync/src/adapters/local-storage/backend/storage.ts)

Why it is hot:

- `set-field` commands clone values field-by-field
- `add-component` and upsert paths clone whole serialized objects
- processing is capped to `0.5ms`
- flush writes `JSON.stringify(state)` for the entire stored scene snapshot

Effect:

- backend backlog becomes the hidden retained-memory sink
- flushes create multi-millisecond stalls
- if command production stays above consumption, memory will trend toward tab death

### Hotspot 4: Full-snapshot flush cost is not small

Files:

- [src/libs/state-sync/src/adapters/local-storage/backend/storage.ts](/workspaces/better-ecs/src/libs/state-sync/src/adapters/local-storage/backend/storage.ts)

Measured:

- observed flush durations around `3.76ms` to `8.04ms`

Interpretation:

- this matches the observed short frame dips during persistence writes
- this is not the primary crash cause, but it is a real visible stutter source

## Why The Tab Eventually Crashes

The most likely crash chain is:

1. moving conveyor state generates very high serialization traffic
2. render passes add additional dirty-queue churn every frame
3. engine diff queue drains quickly, hiding the problem
4. local-storage backend internal buffer grows because `0.5ms` processing budget cannot keep up
5. each queued command deep-clones payload data, retaining more JS heap
6. periodic flushes add extra allocation and main-thread stalls through full-snapshot `JSON.stringify`
7. over a long enough session, retained backlog plus related allocations push the tab into heavy GC and eventually crash

The crucial point is that the crash is not best explained by “local storage is slow.” It is better explained by “the persistence sink is receiving far more tracked mutations than it can ever safely consume.”

## Micro-Stutter Sources

### Minor intermittent stutter

Likely source:

- full-snapshot `JSON.stringify` flushes in the local-storage backend

This matches the measured `~4ms` to `~8ms` flush durations.

### Ongoing micro-stutter / unstable frame pacing

Likely sources:

- render-pass serializable mutations every frame
- conveyor moving-item state generating high mutation volume
- queue/drain/clone pressure creating GC churn even before the tab is near failure

## Findings By Confidence

### Confirmed

- render code mutates serializable visual fields every frame in [src/app/client/src/render/passes/ApplyContextVisualsPass.ts](/workspaces/better-ecs/src/app/client/src/render/passes/ApplyContextVisualsPass.ts)
- conveyor moving-item state is serializable in [src/app/client/src/components/conveyor-belt.ts](/workspaces/better-ecs/src/app/client/src/components/conveyor-belt.ts)
- removing conveyors stabilizes memory dramatically
- engine queue health is misleading because backlog can move into the local-storage backend buffer
- local-storage backend can retain six-figure to seven-figure command backlogs under conveyor stress

### Highly likely

- the eventual tab crash is caused by retained backend command backlog plus related allocation churn
- the original overworld demo leak depended on continuously moving conveyor-carried items, not just static belt topology

### Not supported as primary cause

- static placeables alone
- ECS entity/component count explosion
- the local-storage write stall by itself

## Recommended Fix Order

### Priority 1: Stop serializing render-only visual mutations

Do not route transient render output through tracked serializable fields.

Concrete target:

- [src/app/client/src/render/passes/ApplyContextVisualsPass.ts](/workspaces/better-ecs/src/app/client/src/render/passes/ApplyContextVisualsPass.ts)

Best direction:

- move alpha/tint interpolation to non-serializable runtime-only fields
- or write directly to renderer-facing transient state that bypasses dirty tracking entirely

Expected impact:

- immediate queue-volume reduction
- fixes the paused-mode queue explosion
- removes a correctness bug where persistence/networking would observe transient render state

### Priority 2: Separate conveyor runtime state from serialized durable state

Current serialized conveyor fields include highly volatile per-frame animation state.

Best direction:

- keep topology/configuration serializable
- move lane slots, slot progress, and tail-block runtime state into non-serializable runtime-only data structures or companion components excluded from persistence

Expected impact:

- largest reduction in diff traffic
- likely the single biggest fix for long-run crash behavior

### Priority 3: Add sink-side coalescing before cloning and storage

Even after priorities 1 and 2, the sink should not accept unbounded redundant mutation traffic.

Best direction:

- coalesce repeated `set-field` commands per `world/entity/component/field`
- collapse superseded changes before deep-cloning them into backend state
- consider dropping intermediate transient progress changes when newer versions exist

Expected impact:

- smaller backend buffer
- lower retained heap
- less clone overhead

### Priority 4: Rework local persistence write strategy

Best direction:

- do not `JSON.stringify` the full snapshot on every flush under active churn
- prefer chunked persistence, incremental persistence, or a worker-backed sink
- if local storage remains temporary, at minimum increase observability and guardrails around backlog size

Expected impact:

- fewer frame dips
- better visibility into overload

### Priority 5: Add overload protection and diagnostics

Best direction:

- expose backend buffer length in debug UI
- hard-cap or warn when buffered commands exceed thresholds
- log or surface when `processedCommands < emittedCommands` continues for multiple intervals

Expected impact:

- easier early detection before another crash investigation is needed

## Temporary Instrumentation Added During Investigation

I left isolated profiling helpers in the branch because you said that was acceptable for follow-up iteration:

- [src/app/client/src/debug/profiling-helper.ts](/workspaces/better-ecs/src/app/client/src/debug/profiling-helper.ts)
- [src/engine/src/core/engine-serialization.ts](/workspaces/better-ecs/src/engine/src/core/engine-serialization.ts)
- [src/libs/state-sync/src/adapters/local-storage/backend/LocalStorageBackend.ts](/workspaces/better-ecs/src/libs/state-sync/src/adapters/local-storage/backend/LocalStorageBackend.ts)

These expose:

- engine-side diff queue stats
- local-storage backend emitted/processed/backlog counters
- deterministic scene seeding for belts, walls, land claims, gears, and belt loops

## Suggested Next Iteration

If continuing immediately, the highest-value next pass is:

1. remove serialization tracking from `ApplyContextVisualsPass`
2. make conveyor slot/progress runtime-only
3. rerun the same helper-based stress cases and compare:
   - heap trend over 30s
   - backend max buffered commands
   - flush duration

That should tell us very quickly whether the crash path has been actually eliminated or merely reduced.