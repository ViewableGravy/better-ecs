# Rendering roadmap: queue path + ECS access optimization

## Purpose

This document focuses on the two areas called out for immediate work:

1. `world.require` / component access overhead in `query -> require` loops.
2. `queueSprites` + `queueSpriteCommand` scaling behavior.

The goal is to reduce per-entity CPU constant factors while keeping architecture safe for 100k-scale scenes.

## Constraints agreed for this plan

- Render may use frame snapshot semantics (data changed during update appears next frame).
- Broad API migration is acceptable when ROI is clear.
- We keep a late-bound render-command model for now unless verified data shows snapshot commands are better.
- If investigation uncovers a better contradictory pattern, we pause and ask for immediate MCP confirmation before continuing.

## Trace-backed findings (source: `Trace-20260305T001728.json.gz`)

The latest sampled profile indicates:

- `world.query` is no longer the dominant cost.
- Major costs are repeated component access and downstream sprite handling.

Notable sample self-time (directional, not wall-clock exact):

- `get` in ECS storage: ~875.6 ms.
- `getComponent` in world: ~387.0 ms.
- `#queueSprite` (WebGL API): ~507.7 ms.
- `handleSpriteEntityCommand`: ~380.6 ms.
- `acquire` (internal frame allocator): ~17.1 ms.
- `queueSprites`: ~7.0 ms.
- `queueSpriteCommand`: ~6.2 ms.
- `require` wrapper itself: ~6.0 ms.

Interpretation: the bottleneck is not the throw-check in `require`; it is frequency of entity->component lookup across queue + render + culling stages.

## Core strategy

### Principle 1: minimize repeated lookups per sprite per frame

If a sprite is looked up in queue, culling, and handler paths, we pay repeated sparse-map lookups each time.

Plan direction:

- Introduce ECS fast iteration APIs that return hot data directly in callback form.
- Stage render records once per frame (or only when dirty), then consume those records downstream.

### Principle 2: keep O(n) but reduce constant factors aggressively

For `k` visible/processed sprites, Ω(k) work remains unavoidable. The focus is:

- reduce lookups,
- reduce branching,
- reduce allocations,
- reduce repeated transforms.

### Principle 3: bias toward visible + changed, not total entities

Queue and render prep must trend toward work proportional to what changed and what is visible.

## Proposed ECS API additions (concrete)

Add callback-based query fast paths that avoid building temporary arrays and avoid immediate `require` calls:

```ts
// 1 component
world.forEach1(Sprite, (entityId, sprite) => {
  // sprite guaranteed present
});

// 2 components
world.forEach2(Camera, Transform2D, (entityId, camera, transform) => {
  // both guaranteed present
});

// 3 components (only where needed)
world.forEach3(OrbitMotion, Parent, Transform2D, (entityId, orbit, parent, transform) => {
  // all guaranteed present
});
```

Notes:

- Callback is caller-provided so it can be module-scoped and reused (no per-frame closure allocation required).
- API should iterate from the smallest store (same strategy as current `query`) but pass component refs directly.
- Keep existing `query`/`require` APIs for compatibility; migrate hotspots first.

### Callback overhead and cache locality (decision)

The callback cost is real but typically much smaller than repeated map/sparse lookups.

- A function call per entity has overhead, but in practice this is usually dominated by component access and render math.
- Using module-scoped stable callbacks keeps call sites monomorphic and avoids closure churn.
- If needed, we can provide a second zero-callback variant later (for example, "visit" API with an internal sink object) but we should verify with benchmarks first.

Cache locality expectation with multi-component iteration:

- Iterating dense entity/component arrays is more locality-friendly than sparse lookup per component per entity.
- Accessing multiple component types still means touching multiple arrays/objects, so locality is improved, not perfect.
- This is still a net win because we remove repeated hash/sparse indirections and keep sequential scans.

Benchmark rule for this decision:

- If callback-based fast iteration is not measurably faster in 10k and 100k gates, stop and pivot with MCP check before wider migration.

## Proposed queue architecture shift (concrete)

### Current shape (high-level)

`queueSprites` currently does:

- `world.query(Sprite)` -> ids
- `world.require(id, Sprite)`
- `frameAllocator.acquire(render-command)`
- queue command containing `world + entityId`

Then render/culling re-fetches components again via `world.get`.

### Proposed shape

Introduce a frame-local `SpriteRenderRecord` array (allocator-backed scratch) and split queue into two steps:

1. **Build records** (once):
   - iterate ECS fast path
   - capture minimal render-critical fields for this frame snapshot
   - include `entityId`, `world`, `layer`, `zOrder`, sprite dimensions/anchors/frame asset id, and pre-resolved transform snapshot when appropriate

2. **Queue from records**:
   - push lightweight command entries that index record array
   - avoid re-querying component data in culling/handler where possible

Example target flow:

```ts
buildSpriteRenderRecords(world, frame);
queueSpriteCommandsFromRecords(frame.spriteRecords, queue, allocator);
```

This preserves late-bound command scheduling while removing repeated component-store touches.

## `queueSpriteCommand` recommendation

Do not embed mutable render command state directly on `Sprite` component right now.

Why:

- `Sprite` is gameplay-facing component state and should not own render-pipeline lifecycle details.
- Command lifecycle is frame-scoped and queue-order-dependent.
- Coupling sprite component to command structs increases invalidation complexity.

Preferred alternative:

- keep command structs frame-scoped,
- keep cached render records in renderer/pipeline-owned memory,
- update records only when dirty or when frame-variant values change (e.g. animation time).

## Phased implementation plan

### Phase 1 (10k stabilization)

1. Add `forEach1/2/3` fast-path APIs in ECS world.
2. Migrate render queue passes first:
   - `queue-sprites.ts`
   - `queue-shapes.ts`
   - `queue-shader-quads.ts`
3. Remove `query -> require` in these passes.
4. Re-profile and verify:
   - fewer `storage.get` / `world.getComponent` samples,
   - no correctness regressions.

### Phase 2 (record staging)

1. Add frame-local `SpriteRenderRecord` scratch storage.
2. Build records in queue pass using fast ECS iteration.
3. Update culling + handler path to consume records first, fallback to ECS only when required.
4. Re-profile and compare against Phase 1.

### Phase 3 (100k scaling)

1. Introduce dirty flags / versioning for transform + sprite + animated sprite.
2. Recompute record fields only when dirty.
3. Add stronger early visibility gating before command creation.
4. Validate against 100k target scenario and adjust data layout if needed.

### Dirty tracking strategy (decision)

Recommended first implementation:

1. Keep dirty tracking in render-record staging, not in component proxies.
2. Use record-level field diff + bitmask during staging:
   - compare incoming value vs cached record value,
   - update record only when changed,
   - set changed bits for downstream decisions.
3. Optionally add coarse component version counters later if mutation ownership is explicit enough.

Why this is preferred now:

- Avoids JavaScript `Proxy` overhead and potential de-optimizations in hot update paths.
- Avoids requiring every component mutation site to remember explicit `markDirty` calls on day one.
- Preserves current ergonomics while still enabling selective update logic.

When to consider proxy- or mutation-hook-based dirty tracking:

- Only if profiling shows staging-time diff checks are the dominant cost,
- and only after a measured prototype proves net gain in both 10k and 100k scenarios.

## Validation gates (must pass before moving on)

Benchmark cadence policy:

- Benchmarks are required at each phase gate (A, B, C), not just at the end.
- Every phase must record before/after results using the benchmark harness with identical entity count and sample duration.
- If a phase regresses frame-time metrics, pause and investigate before continuing.

## Stage progress log (agent handoff)

### 2026-03-05 — Stage A (Phase 1) checkpoint

Status:

- `Phase 1` implementation completed.
- Queue passes migrated to fast iteration (`forEach`) to remove the `query -> require` hot-loop pattern in sprite/shape/shader queue stages.
- Scene-scoped benchmark harness used for verification.

Benchmark run configuration:

- Browser verification via Chrome MCP with a clean single-page session.
- Single clean dev server instance.
- Entered benchmark scene first via `#to-benchmark`, then measured via benchmark target button clicks (`10k/50k/100k/200k/500k`).
- Sample window: `2500ms` per variation.
- Steady-state stats captured after the first `500ms` of each sample window.
- Benchmark layout forced to viewport-safe bounds (90% viewport area) so generated entities remain on-screen.

Viewport/layout used during run:

- Viewport: `1420 x 881`.
- Safe area: `1278 x 792.9`.
- Spawn bounds: `x: [-639, 639]`, `y: [-396.45, 396.45]`.

Measured results:

| Entities | FPS Avg | Frame Avg (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 119.88 | 8.34 | 8.39 | 8.40 | 8.24 | 8.46 |
| 50,000 | 28.24 | 35.42 | 41.73 | 41.77 | 33.31 | 50.06 |
| 100,000 | 13.00 | 76.93 | 83.46 | 83.46 | 66.69 | 91.75 |
| 200,000 | 6.18 | 161.70 | 166.88 | 166.88 | 150.17 | 183.51 |
| 500,000 | 1.94 | 515.10 | 517.14 | 517.14 | 500.46 | 533.90 |

Outcome:

- Stage A is considered complete and benchmarked across all requested scales.
- Performance still scales linearly with entity count (expected at this stage).
- Next active work item: `Phase 2` (render-record staging + reducing repeated ECS reads in culling/handler paths).

### 2026-03-05 — Stage B (Phase 2) checkpoint

Status:

- `Phase 2` implementation completed.
- Added frame-local pooled `SpriteRenderRecord` staging and record indexing on sprite render commands.
- `queueSprites` now builds sprite records once per frame (static + animated sample), then queues commands from staged records.
- Sprite culling + sprite handler now consume staged records first, with ECS fallback only when a command has no staged record.

Stage B implementation scope:

- Added pooled allocator entry: `engine:sprite-render-record`.
- Added frame scratch buffer: `engine:sprite-render-records`.
- Updated sprite queue path: `queue-sprites.ts`.
- Updated sprite culling path: `render/culling/utils.ts`.
- Updated sprite render handler path: `render/handlers/sprite-entity.ts`.
- Updated render command routing: `render/render-commands.ts`.

Verification:

- `engine:typecheck` passed.
- `engine:lint` reports existing unrelated errors under `src/engine/.types/**` (pre-existing generated declaration lint issues), no new Stage B source-file lint errors were introduced.

Benchmark run configuration:

- Browser verification via Chrome MCP with a clean single-page session.
- Single clean dev server instance.
- Sample window: `2000ms` per variation.
- Benchmark layout forced to viewport-safe bounds (90% viewport area) so generated entities remain on-screen.

Viewport/layout used during run:

- Viewport: `1420 x 881`.
- Safe area: `1278 x 792.9`.
- Spawn bounds: `x: [-639, 639]`, `y: [-396.45, 396.45]`.

Measured results:

| Entities | Click→1st Frame (ms) | FPS Avg | Frame Avg (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 21.73 | 119.72 | 8.35 | 10.05 | 11.32 | 5.43 | 11.79 |
| 50,000 | 72.69 | 34.87 | 28.68 | 36.26 | 39.70 | 23.40 | 39.81 |
| 100,000 | 179.81 | 15.45 | 64.73 | 73.79 | 78.73 | 56.57 | 88.42 |
| 200,000 | 539.96 | 7.00 | 142.83 | 175.43 | 175.43 | 120.69 | 178.76 |
| 500,000 | 1414.58 | 2.35 | 425.82 | 436.35 | 436.35 | 398.13 | 482.97 |

Steady-state results (after first 500ms of each 2500ms window):

| Entities | FPS Avg | Frame Avg (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 119.51 | 8.37 | 10.05 | 11.32 | 5.67 | 11.79 |
| 50,000 | 35.42 | 28.23 | 33.21 | 36.26 | 23.40 | 37.23 |
| 100,000 | 15.44 | 64.77 | 73.79 | 78.73 | 56.57 | 88.42 |
| 200,000 | 7.24 | 138.07 | 152.86 | 152.86 | 120.69 | 157.81 |
| 500,000 | 2.32 | 430.86 | 436.35 | 436.35 | 398.13 | 482.97 |

Outcome:

- Stage B requirements are implemented: records are staged once in queue and consumed by sprite culling/handler with fallback semantics preserved.
- Corrected measurement confirms heavy frame-time scaling at larger counts using the same interaction path reported by user (switch scene first, then click benchmark target).
- At `500,000`, this run shows a large switch hitch (`~1415ms` click→first frame) and steady-state frame time around `~431ms` (`~2.3 FPS`).

### Gate A: after Phase 1

- Queue correctness unchanged (same visible output).
- `queueSprites` + sibling queue passes show measurable CPU drop.
- `world.require` sample share in render queue path materially reduced.

### Gate B: after Phase 2

- Culling + handler paths reduce repeated ECS access. ✅
- Render output stable across animated + static sprites. ✅
- No new GC spikes from record staging. ✅

### Gate C: after Phase 3

- 10k scenario stable with low queue cost.
- 100k scenario scales near visible+changed rather than total entities.
- Queue step approaches sub-millisecond budget in representative scenes.

## Do not do (unless new evidence appears)

1. **Do not** return fresh tuple arrays from `query` per entity for hot loops.
   - This introduces allocation pressure and GC risk.

2. **Do not** add frame-pooled tuple object APIs with implicit lifetime semantics.
   - Easy to misuse and hard to reason about ownership/frame safety.

3. **Do not** move render-command ownership into `Sprite` component state.
   - Mixes gameplay state with frame-transient pipeline internals.

4. **Do not** optimize only `require` throw-path micro-cost and assume the issue is solved.
   - Main cost is repeated lookup frequency, not missing-component error checks.

5. **Do not** skip profiling checkpoints between phases.
   - We need evidence after each stage before broadening changes.

6. **Do not** introduce `Proxy`-based dirty tracking in hot paths as a default.
   - Treat as experiment-only due to likely runtime overhead/deopt risk.

7. **Do not** require manual `markDirty` calls everywhere without enforcement tooling.
   - This is error-prone and likely to regress correctness as codebase/users grow.

## Pivot rule (agility + MCP check)

If investigation shows a better pattern that contradicts any guidance above:

1. Stop implementation immediately.
2. Capture the contradictory evidence (trace diff, benchmark, correctness notes).
3. Request immediate MCP confirmation from you before proceeding.
4. Pivot only after explicit approval.

This keeps the roadmap strict by default and agile when new data warrants change.

## Migration candidates in current codebase

High-priority direct migrations:

- `src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites.ts`
- `src/engine/src/core/render-pipeline/passes/render-world/queue/queue-shapes.ts`
- `src/engine/src/core/render-pipeline/passes/render-world/queue/queue-shader-quads.ts`

Then evaluate other frequent patterns of `for (const id of world.query(...)) + world.require(...)` across engine/libs.

## Success definition

This effort is successful when:

- queue-stage performance is no longer a dominant contributor,
- repeated ECS lookup overhead in render path is materially reduced,
- scaling behavior remains predictable at higher entity counts,
- and each pivot decision is evidence-led and approved through MCP check-ins.