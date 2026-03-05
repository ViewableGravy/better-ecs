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

### D5 — hierarchy-native storage + tree-walk transform propagation

Priority:

- High priority after D3 validation, before broad D2 cache rollout.

Problem:

- Parent-linked entities are currently resolved from flat world storage per entity, which repeats parent-chain work for many children.
- Conveyor-like structures are an extreme case where parent transform computation is redundantly repeated across sibling entities.

Plan:

- Introduce hierarchy-native runtime storage for parent/child relationships (tree/indexed adjacency) alongside ECS component storage.
- During update, walk the hierarchy top-down once and propagate world transforms to descendants.
- Store propagated world transforms in a render-ready structure so queue stage reads direct values instead of recomputing parent chains.
- Keep ECS `Parent` semantics as source-of-truth API, while adding fast hierarchy indices for runtime traversal.

Expected impact:

- Significant reduction in repeated `resolveWorldTransform2D`/`getComponent` parent-chain work in deep or wide hierarchies.
- Better scaling for conveyor-style and nested-attachment scenes.

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

- D1 implementation completed.
- D3 implementation completed before D2, per current priority.

## Quantified impact (D1 + D3)

Measurement method:

- Same benchmark harness path and sample windows as Stage C (`2000ms` immediate, `2500ms` steady with first `500ms` excluded).
- Same viewport/layout: `1420 x 881`, safe area `1278 x 792.9`.
- Runs captured in one session immediately before and after D3.

Steady-state comparison:

| Entities | Pre-D3 FPS | Post-D3 FPS | Delta | Pre-D3 Frame Avg (ms) | Post-D3 Frame Avg (ms) | Delta |
|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 119.88 | 119.88 | +0.0% | 8.34 | 8.34 | -0.0% |
| 50,000 | 30.09 | 51.73 | +71.9% | 33.23 | 19.33 | -41.8% |
| 100,000 | 15.23 | 26.10 | +71.4% | 65.66 | 38.31 | -41.7% |
| 200,000 | 6.58 | 12.52 | +90.2% | 151.94 | 79.89 | -47.4% |
| 500,000 | 2.10 | 4.15 | +97.6% | 475.49 | 240.98 | -49.3% |

Interpretation:

- D3 static/dynamic cohort reuse materially reduced queue-path CPU cost at high counts.
- Largest gains occur in high-entity scenarios where static cohort reuse avoids repeated transform resolve + record write + culling work.
- 10k remains frame-capped, so low-count behavior is unchanged as expected.
