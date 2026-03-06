# Rendering 1M Entity Audit and Implementation Roadmap

## Status

This document is the **single source of truth** for this rendering scalability effort.

It should contain:

- the current goals
- the architectural investigation
- the accepted performance model
- the implementation phases
- the current phase
- benchmark notes and timing history
- completed work and future work

All work done for large-scale rendering should update this document rather than splitting planning state across multiple files.

---

## Purpose

The goal is to make the engine structurally capable of scaling toward **~1,000,000 relevant on-screen entities** while preserving:

- predictable performance
- maintainable engine architecture
- type-safe userland APIs
- safe long-term feature development

This roadmap assumes an important constraint:

> We should assume up to ~1,000,000 relevant entities can already be on screen, so culling is **not** the primary save for this phase.

Spatial streaming, serialization, and visibility structures still matter, but they are treated as **later-phase improvements**, not as the main reason the engine should perform well.

The target domain is especially influenced by **conveyor-heavy gameplay**, where many visible moving items may exist simultaneously.

---

## Non-Negotiable Performance Model

### 1. No general per-frame compare sort for gameplay rendering

Gameplay rendering should not depend on sorting a flat command list every frame.

Preferred model:

- fixed render `layer`
- then material / atlas / shader bucket
- then explicit stable ordering only where visuals require it

For ordering inside buckets:

- use **stable append order** when content is naturally order-independent or already deterministic
- use an explicit `subLayer` when visual stacking is required
- avoid returning to full compare-based sorting

### 2. Precompute world transforms once

World transform resolution must not happen repeatedly inside render, culling, input, or editor hot paths.

Preferred model:

- local transform inputs
- parent relationship inputs
- one transform pipeline computes world-space outputs
- downstream systems read world-space values directly

### 3. Dense ECS iteration with array-backed sparse access

The ECS should remain dense for iteration and move fully toward indexed sparse storage.

Preferred model:

- dense component arrays
- dense entity arrays
- sparse entity-index lookup via array / typed array
- zero-allocation hot iteration APIs

### 4. GPU-ready render staging must happen before submission

The render path should stage data that is already close to GPU submission format.

Preferred model:

- atlas/material resolved up front
- UVs/material handles resolved up front
- transform already precomputed
- renderer writes into per-bucket instance buffers directly

### 5. Not every gameplay visual should be a render entity

For conveyor-heavy simulation, 1:1 mapping between visible items and ECS render entities is likely too expensive.

Preferred model:

- core ECS remains available for general gameplay entities
- high-cardinality domain cases can expose packed aggregate render pathways
- conveyors are the first likely target for this pattern

### 6. Userland must stay type-safe and reasonably fast

Engine internals may become more specialized, but userland should still interact through stable, typed abstractions.

Preferred model:

- userland refers to typed assets/material descriptors, not raw atlas offsets
- engine owns low-level packing and GPU-specific translation
- fast paths should be available by default, not only through obscure engine internals

---

# 1. Current Audit, Outline, and Investigation

## Executive Summary

The engine already has several good foundations:

- dense component arrays in [src/engine/src/ecs/storage.ts](src/engine/src/ecs/storage.ts)
- component-centric iteration in [src/engine/src/ecs/world.ts](src/engine/src/ecs/world.ts)
- frame-local pooling in [src/engine/src/render/frame-allocator/internal-frame-allocator.ts](src/engine/src/render/frame-allocator/internal-frame-allocator.ts)
- GPU sprite instancing in [src/engine/src/render/renderers/webGL/api.ts](src/engine/src/render/renderers/webGL/api.ts)
- staged sprite records in [src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites](src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites)

However, it is still structurally closer to a **100k-class renderer** than a **1M-class renderer**.

The main blockers are:

1. global per-frame render-command sorting
2. on-demand transform hierarchy traversal
3. `Map`/`Set` based ECS sparse lookup
4. batching that depends on consecutive texture order
5. too much assumption that visible gameplay content should become individual ECS render entities

## Current Architecture Summary

### ECS storage

Current state:

- `ComponentStore<T>` is dense for iteration
- sparse lookup still uses `Map<number, number>` in [src/engine/src/ecs/storage.ts](src/engine/src/ecs/storage.ts)
- world entity tracking uses `Set<EntityId>` in [src/engine/src/ecs/world.ts](src/engine/src/ecs/world.ts)

Assessment:

- good starting point
- not yet final-form for million-scale hot access

### Render pipeline

Current state:

- passes queue commands into `RenderQueue`
- commands are sorted globally in [src/engine/src/render/queue/render-queue.ts](src/engine/src/render/queue/render-queue.ts)
- commands are then interpreted in [src/engine/src/core/render-pipeline/passes/render-world/render/render-commands.ts](src/engine/src/core/render-pipeline/passes/render-world/render/render-commands.ts)

Assessment:

- flexible
- maintainable at small scale
- too indirect for 1M-scale gameplay rendering

### Transform flow

Current state:

- `resolveWorldTransform2D()` walks `Parent` chains in [src/engine/src/ecs/hierarchy.ts](src/engine/src/ecs/hierarchy.ts)
- render, input, gizmos, and editor systems depend on that path

Assessment:

- correct
- too expensive and too easy to accidentally reuse in future hot paths

### Sprite submission

Current state:

- sprites have the best current path
- sprite records are staged
- WebGL uses instancing
- batching still flushes on texture change in [src/engine/src/render/renderers/webGL/api.ts](src/engine/src/render/renderers/webGL/api.ts)

Assessment:

- strongest existing path
- still not enough because the surrounding architecture is command-driven rather than bucket-driven

### Conveyor-specific concern

Current state:

- the engine does not yet have a first-class aggregate conveyor rendering model
- the architecture still leans toward item-as-entity, item-as-render-command patterns

Assessment:

- this is likely the most important domain-specific scaling issue
- conveyors should be treated as a supported special case in engine architecture, not as a workaround

## Main Findings

### Finding A: Sorting is now a structural problem, not a detail problem

The current flat command queue requires full ordering work that should be replaced with explicit buckets and fixed ordering rules.

### Finding B: Transform precomputation is a high-value engine invariant

Moving to a world-transform pipeline is not only a performance optimization. It is also a maintainability improvement because it removes an easy-to-abuse slow path.

### Finding C: Typed-array sparse access is worth a large refactor

The engine already encodes entity IDs into a bounded index space in [src/engine/src/ecs/entity.ts](src/engine/src/ecs/entity.ts). That makes a stronger sparse-set design practical.

### Finding D: Atlas/material staging should stay engine-owned

Userland should remain typed and ergonomic. The engine should own the translation from high-level sprite/material concepts into atlas/material handles.

### Finding E: Conveyors likely need an aggregate render path

If conveyors are a core gameplay primitive, the engine should support them as packed render sources rather than forcing every carried item into general-purpose sprite entity flow.

## Accepted Direction

The agreed near-term direction is:

1. bucketed render submission
2. precomputed transform system
3. typed-array ECS sparse storage
4. GPU-ready atlas/material staging with type-safe userland APIs
5. conveyor-specific aggregate rendering support
6. spatial/streaming structures later

---

# 2. Concrete Steps

## Phase Plan Overview

### Phase 0 — Source of truth and acceptance criteria

Goal:

- keep this document current
- ensure every step updates current phase, notes, and benchmarks

Exit criteria:

- this document remains the single planning and status artifact for the effort

### Phase 1 — Replace flat sorting with buckets

Goal:

- remove the global compare-sort dependency from gameplay rendering

Concrete steps:

1. define a bucket model:
	- render `layer`
	- `material` / `atlas` / `shader` bucket
	- optional `subLayer` or stable append semantics
2. redesign `RenderQueue` into bucketed submission structures
3. replace command sorting in [src/engine/src/render/queue/render-queue.ts](src/engine/src/render/queue/render-queue.ts)
4. change world render passes so they emit into buckets directly
5. separate gameplay buckets from editor/debug/UI buckets where useful

Success criteria:

- no global per-frame compare sort on gameplay render path
- deterministic ordering rules are explicit
- draw submission structure matches batching structure

### Phase 2 — Add precomputed transform pipeline

Goal:

- remove render/input/editor dependence on `resolveWorldTransform2D()` hot-path traversal

Concrete steps:

1. introduce `WorldTransform2D` or equivalent packed world transform storage
2. create a dedicated transform update system with dirty propagation
3. migrate sprite queueing to world-transform reads
4. migrate render handlers and culling to world-transform reads
5. migrate mouse/editor/gizmo hot paths to world-transform reads
6. leave compatibility helpers only where needed, and clearly mark them as non-hot-path APIs

Success criteria:

- gameplay rendering no longer resolves parent chains per renderable
- input/editor hot paths do not use parent traversal in steady-state interaction

### Phase 3 — Upgrade ECS sparse storage to indexed arrays / typed arrays

Goal:

- make sparse access predictable and cheap

Concrete steps:

1. replace `ComponentStore.sparse` map with indexed numeric storage
2. replace generation map with indexed numeric storage
3. review world entity tracking and replace `Set` where practical for hot access
4. add or expand zero-allocation iteration APIs
5. migrate any remaining hot systems away from `query()` array allocation patterns

Success criteria:

- hot membership/access no longer depends on `Map`/`Set`
- hot systems rely primarily on dense iteration and indexed sparse lookup

### Phase 4 — GPU-ready atlas/material staging

Goal:

- make render staging closer to final submission format while keeping userland typed

Concrete steps:

1. define engine-owned material/atlas handle abstraction
2. convert sprite staging from `assetId`-centric flow to resolved material/atlas flow
3. stage UV/material data before renderer submission
4. batch using resolved material keys
5. keep userland-facing API typed around assets/material descriptors rather than raw atlas internals

Success criteria:

- sprite submission path does not repeatedly resolve string/object asset lookups in the hottest path
- userland remains type-safe and stable

### Phase 5 — Conveyor aggregate rendering pathway

Goal:

- support conveyor-heavy gameplay without 1:1 render entity scaling

Concrete steps:

1. define a conveyor-owned packed render data model
2. represent carried items as conveyor lane/slot/progress data where possible
3. emit carried-item instance data directly from conveyor-owned arrays
4. integrate this path into the same bucket/material pipeline as normal sprite rendering
5. document when gameplay systems should use aggregate rendering instead of spawning more render entities

Success criteria:

- conveyor-carried item rendering does not require one sprite entity per visible item
- the pathway is a documented engine feature, not an ad hoc optimization

### Phase 6 — Non-sprite cleanup and isolation

Goal:

- keep shape/shader/debug/editor paths from fragmenting the gameplay hot path

Concrete steps:

1. isolate editor/debug/UI rendering passes where practical
2. remove avoidable allocations in shape and shader paths
3. batch non-sprite paths where worthwhile
4. eliminate per-draw object spread and avoidable `Float32Array` churn where possible

Success criteria:

- gameplay sprite path remains contiguous and minimally fragmented
- non-sprite paths are either isolated or intentionally optimized

### Phase 7 — Spatial/streaming structures later

Goal:

- integrate future streaming/spatial systems without distorting current priorities

Concrete steps:

1. ensure bucket/render source architecture can accept spatial registries later
2. ensure server-streamed entity storage can integrate cleanly with render sources
3. add visibility structures only after the above phases are stable

Success criteria:

- future spatial systems plug into the rendering architecture rather than redefining it

## Cross-Phase Rules

### Rule 1: Maintainability is part of the target

Large refactors are acceptable when they reduce architectural ambiguity and prevent future slow-path regressions.

### Rule 1.5: Every major step must be validated with Chrome MCP performance tracing

Do not treat architectural changes as wins without measuring them in a real scene.

Required validation process for each meaningful rendering change:

1. run the scene in Chrome
2. capture a trace with Chrome MCP performance tooling
3. inspect actual function-level time spent in the hot path
4. record whether the change reduced, preserved, or regressed frame cost

This effort should prioritize **measured function time** over assumptions or structural cleanliness alone.
If a new abstraction is architecturally better but still consumes a large fraction of the frame, it is not finished.

### Rule 2: New hot paths must be hard to misuse

If a fast system relies on subtle rules, wrap those rules in engine-owned abstractions.

### Rule 3: Type-safe userland remains a requirement

Low-level packing details should stay engine-owned.

### Rule 4: Conveyor-scale content is first-class

Conveyors are not an edge case. If they dominate real gameplay, the engine architecture should say so directly.

---

# 3. Current Implementation Phase, Performance Notes, and Timing

## Current Phase

**Current active phase target:** Phase 1 — Replace flat sorting with buckets

Rationale:

- sorting is currently a structural cost on every frame
- bucket design sets up the rest of the roadmap
- transform precomputation, atlas/material staging, and conveyor aggregate rendering all fit better once submission structure is bucket-driven

## Current Implementation Status Summary

### 2026-03-06 — Phase 1 bucketed submission checkpoint

Status:

- replaced the flat `RenderQueue.commands.sort(...)` path with bucketed submission storage keyed by render scope, layer, sub-layer, and bucket kind
- grouped gameplay sprite commands by material-style bucket keys during queue emission
- grouped shader quad commands by shader bucket keys during queue emission
- separated overlay gizmo shape draws from gameplay buckets through an explicit render scope
- removed the standalone render-world sort pass so render iteration now walks bucket structure directly
- added focused queue tests for bucket grouping and scope/layer ordering

Verification notes:

- `engine:typecheck` passes
- focused `src/render/queue/render-queue.spec.ts` passes
- workspace `engine:lint` is currently blocked by pre-existing `.types/` lint failures unrelated to this phase
- workspace `engine:test` is currently blocked by pre-existing shader import / UI type-resolution failures unrelated to this phase
- Chrome MCP performance tracing is required before considering Phase 1 complete from a performance perspective

Performance observation:

- `forEachCommand()` is still showing roughly **25ms per frame** in the main scene during Chrome performance tracing
- that means bucket iteration alone is currently consuming roughly **25% of total frame time** in the measured scenario
- at that cost, the current implementation is still structurally too expensive even though it removed the old global compare-sort path
- Phase 1 should therefore be treated as **architecturally redirected but not performance-complete** until bucket traversal overhead is reduced substantially

### 2026-03-06 — Phase 1 traversal follow-up

Status:

- removed render-path use of `forEachCommand()`
- removed render-path use of per-frame flattened `queue.commands` materialization
- switched the hot render loop to iterate preordered buckets directly
- kept `queue.commands` only as a compatibility/debug view instead of the main render-path structure
- added an opt-in runtime measurement hook for render-queue traversal so Chrome MCP validation can sample real scene cost directly in-browser

Chrome MCP validation notes:

- Chrome MCP performance tracing was re-run on the main scene after the traversal change
- the current main-scene run did **not** reproduce the previous 25ms `forEachCommand()` hotspot
- the opt-in runtime traversal sample on the current main-scene/full-zoom run measured roughly **0.0013ms average traversal cost per frame** with about **23 queued commands per frame**
- this means the old callback-driven traversal bottleneck has been eliminated in the currently reproducible scene state

Caveat:

- the currently reproducible main-scene setup appears much smaller than the earlier reported hotspot case, so this validation confirms the hot path is now cheap for the current scene state but does **not** yet explain the earlier 25ms trace by itself
- if a heavier main-scene reproduction still exists, it should be re-profiled with the updated build before Phase 1 is declared fully closed

### Completed investigation and accepted conclusions

- confirmed dense ECS iteration exists and is worth preserving
- confirmed sprite instancing exists and should be retained
- confirmed transform traversal is still hot-path architecture
- confirmed global sort should be replaced
- confirmed culling is not the primary answer for this phase
- accepted that conveyor-specific aggregate rendering is a valid engine-level solution

### Previously completed optimization work already in repo

The repo already includes prior render-path work, especially around sprite staging:

- `forEach` iteration APIs in [src/engine/src/ecs/world.ts](src/engine/src/ecs/world.ts)
- pooled sprite render records in [src/engine/src/core/render-pipeline/passes/render-world/sprite-render-record.ts](src/engine/src/core/render-pipeline/passes/render-world/sprite-render-record.ts)
- sprite queue staging in [src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/index.ts](src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/index.ts)

These are useful foundations, but they do not replace the roadmap phases above.

## Benchmark History and Timing Notes

### Existing measured baseline from prior roadmap work

Existing benchmark notes in [docs/RENDERING_50K_120FPS_ROADMAP.md](docs/RENDERING_50K_120FPS_ROADMAP.md) show the following steady-state results after prior sprite-path work:

| Entities | FPS Avg | Frame Avg (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 119.51 | 8.37 | 10.05 | 11.32 | 5.67 | 11.79 |
| 50,000 | 35.42 | 28.23 | 33.21 | 36.26 | 23.40 | 37.23 |
| 100,000 | 15.44 | 64.77 | 73.79 | 78.73 | 56.57 | 88.42 |
| 200,000 | 7.24 | 138.07 | 152.86 | 152.86 | 120.69 | 157.81 |
| 500,000 | 2.32 | 430.86 | 436.35 | 436.35 | 398.13 | 482.97 |

Interpretation:

- the engine already degrades sharply before 500k
- the current render path is not viable for a 1M on-screen target
- per-frame structure matters more now than localized micro-optimizations

## Performance Notes by Problem Area

### Sorting

Current note:

- global sort cost is guaranteed work every frame
- replacing it is a foundational requirement, not a later polish task
- bucket traversal itself must also be treated as a measurable hot path, not assumed free simply because compare-sort was removed
- if bucket iteration (`forEachCommand()`) remains double-digit milliseconds in real scenes, it is still a Phase 1 bottleneck and should be optimized further

### Transform traversal

Current note:

- transform traversal cost appears in multiple subsystems, not only rendering
- a world-transform pipeline should improve both performance and future safety

### ECS sparse storage

Current note:

- current dense arrays are good
- sparse `Map`/`Set` usage is now one of the major remaining structural costs

### Conveyor rendering

Current note:

- likely the highest-value domain specialization
- should be implemented deliberately as engine architecture, not as a one-off optimization

## How to Update This Section During Work

When work progresses, update this section with:

1. **Current active phase**
2. **Completed steps in that phase**
3. **Chrome MCP trace evidence with actual hot-function timings**
4. **New benchmark tables**
5. **Observed regressions or surprises**
6. **Decision changes**

Recommended log format for future entries:

### YYYY-MM-DD — Phase X checkpoint

Status:

- completed steps
- remaining steps

Benchmarks:

| Scenario | FPS Avg | Frame Avg (ms) | Notes |
|---|---:|---:|---|

Observations:

- key result 1
- key result 2
- top hot functions from Chrome trace and their measured times

Decision:

- continue / pivot / simplify

---

## Immediate Next Actions

1. design the bucket data model and ordering semantics
2. identify how current `RenderQueue` transitions into bucketed submission
3. define the `WorldTransform2D` migration shape so Phase 2 can start immediately after Phase 1
4. define what a typed material/atlas handle looks like for userland-facing APIs
5. outline the conveyor aggregate render data model before implementation begins, so later phases do not fight the same abstraction twice

---

## Final Direction Summary

If the engine is going to scale toward ~1,000,000 on-screen entities, the priority order is:

1. **bucketed render submission**
2. **precomputed world transforms**
3. **array-backed sparse ECS access**
4. **GPU-ready atlas/material staging with type-safe userland APIs**
5. **aggregate conveyor/item rendering**
6. **spatial/streaming structures later**

Anything below that is secondary.
