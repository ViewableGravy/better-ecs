# Stage D queue-hotspot performance plan (post Stage C)

## Scope

This document tracks the next implementation phase focused on queue-path CPU hotspots after Stage C.

## Trace verification source

- Trace file: `Trace-20260305T222425.json.gz`
- Method: extracted V8 `Profile` + `ProfileChunk` samples and aggregated sampled time by function name.

Sampled hotspot summary from that trace (ms, directional):

| Function | Sampled Time (ms) |
|---|---:|
| `get` | 1367.74 |
| `copyFrom` | 975.63 |
| `#queueSprite` | 961.18 |
| `resolveRecord` | 907.17 |
| `getComponent` | 300.36 |
| `writeSpriteRecord` | 299.14 |
| `writeTransformRecord` | 261.48 |
| `resolveWorldTransform2D` | 144.43 |
| `queue` | 142.35 |
| `isSpriteWithinCullingBounds` | 43.38 |
| `queueSpriteCommand` | 5.07 |

Interpretation:

- Queue-path record lookup and record writing costs are major contributors.
- Render-time `copyFrom` was previously expensive and should be removed from sprite command path.
- `resolveWorldTransform2D` is still meaningful, but not the leading sampled cost in this trace.

## Previous recommendation status

The previous high-ROI recommendation list is now marked as:

- Completed in principle for Stage C goals where applicable.
- Superseded for further work by this Stage D plan with concrete tasks and gates.

## Stage D goals

1. Reduce queue-path per-entity overhead without regressing correctness.
2. Remove avoidable hot-path allocations and redundant lookups.
3. Keep architecture aligned with eventual 100k–500k visible-entity target.

## Immediate implementation plan

### D1 — hot-loop overhead reductions (in progress)

- Reuse cache/world-state handles per frame to avoid repeated singleton + weak-map lookups per entity.
- Remove writer snapshot object allocations by passing primitive args directly.
- Remove sprite render-path `copyFrom` by using staged world-transform reference directly.

Expected impact:

- Lower `resolveRecord` overhead.
- Lower `copyFrom` sampled time in render command handling.
- Slight reduction in queue write pressure.

### D2 — transform resolution strategy

- Short-term: keep existing hierarchy resolve behavior for correctness.
- Next step candidate: implement a non-parent fast path and fallback to full hierarchy resolve only when required.
- Long-term: add update-phase world-transform cache / dirty propagation to remove per-entity hierarchy recomposition from queue pass.

Expected impact:

- Direct reduction in `resolveWorldTransform2D` + `getComponent` sampled cost.

### D3 — record write throttling / static cohort strategy

- Split static vs dynamic sprite cohorts.
- Recompute transform and sprite record fields only for dynamic/dirty entities.
- Keep static records queued from compact precomputed lists when camera/culling state is unchanged.

Expected impact:

- Largest long-term queue CPU reduction for high visible counts.

### D4 — visibility and spatial candidate reduction

- Introduce spatial buckets/cells so visibility checks run on candidate buckets, not full entity set.
- Treat this as required even for high-visible scenarios because candidate reduction still helps by reducing cache and branch pressure.

Expected impact:

- Lower total calls to `isSpriteWithinCullingBounds` and queue command creation.

## Data-structure direction (map/has pressure)

To address map/has costs directly:

- Keep world-facing correctness APIs, but add queue-owned dense arrays for iteration and staged command inputs.
- Use direct indexed arrays for active render records where possible, avoiding repeated map lookups in the inner loop.
- Keep map lookups at boundaries (entity add/remove), not per-frame per-entity hot loops.

## Validation gates

For each Stage D sub-step:

1. Run benchmark at `10k/50k/100k/200k/500k` with same harness.
2. Compare trace sample share for:
   - `resolveRecord`
   - `writeSpriteRecord`
   - `writeTransformRecord`
   - `resolveWorldTransform2D`
   - `getComponent`
   - `copyFrom`
3. Require no visual correctness regression for static + animated sprites.

## Current active work

- D1 implementation started.
- After D1 is merged and benchmarked, proceed to D2 non-parent fast path prototype.
