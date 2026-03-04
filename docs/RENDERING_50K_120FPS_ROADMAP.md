# Rendering roadmap: 6k -> 50k sprites @ 120 FPS

## Goal and budget

- Target frame time at 120 FPS: **8.33 ms** total.
- Practical CPU budget for world render prep + submission: **~2.5-3.5 ms** (leave room for gameplay, UI, input, physics, GC).
- At 50k sprites, every per-sprite CPU operation matters. The plan must shift from **"scan everything every frame"** to **"maintain visible/renderable sets incrementally"**.

## What the latest trace says

Source trace: `Trace-20260305T001728.json.gz`

Primary findings from CPU samples:

1. `world.query` is now much smaller than before (good improvement).
2. Remaining hot spots are mostly per-entity render prep and component access:
   - `get` in ECS storage (`storage.ts`) is very high.
   - `getComponent` (`world.ts`) is high.
   - `handleSpriteEntityCommand` and `#queueSprite` are high.
   - `resolveWorldTransform2D` and `#worldToScreen` are non-trivial.
3. Culling and texture management are present but not currently dominant.

Interpretation:

- Query optimization helped, but the bottleneck moved to **the rest of the per-sprite CPU pipeline**.
- This is expected: once query is cheaper, component fetches/transforms/command setup become the next ceiling.

## Can this be O(log n)?

Short answer: not for full per-frame enumeration of all sprites.

- If you need to output/process `k` sprites this frame, lower bound is **Ω(k)**.
- So the right approach is not chasing `O(log n)` query for this use case; it is reducing `k` and reducing per-item constant cost.

What can be `O(log n)` or better in practice:

- Looking up whether one entity belongs to one set.
- Updating indexes when one entity changes.
- Spatial insert/remove/query structures for culling (often amortized near O(log n) per update/query).

But drawing/queuing `k` visible sprites still costs at least proportional work.

## Priority roadmap (highest ROI first)

## P0 — Keep query optimization, stop re-scanning where possible

Outcome target: make sprite list retrieval mostly incremental instead of rebuilt every frame.

- Maintain a persistent **renderable sprite entity list** (or set) updated on component add/remove.
- Avoid `world.query(Sprite)` every frame when membership is unchanged.
- Only rebuild full list on world reset/scene swap; otherwise patch incrementally.

Why first:

- Cheapest architectural win with immediate frame-time stability improvements.
- Prevents linear full-world scans from reappearing as content grows.

## P1 — Eliminate repeated component lookups in render hot path

Outcome target: reduce repeated `world.get` / `getComponent` calls per sprite.

- In queue/render path, fetch required component references once and reuse in that frame step.
- Prefer iterating a structure already containing direct sprite render records (entityId + direct refs/indices).
- Avoid repeated entity->component map lookups across multiple render sub-steps.

Why second:

- Trace shows storage `get` + world `getComponent` are top contributors.

## P2 — Introduce frame-stable render records (dirty-update model)

Outcome target: do expensive transform/state computation only when changed.

- Keep a per-sprite render record cache (world transform, bounds, texture frame, layer, z).
- Mark dirty on transform/sprite/animation changes.
- Recompute only dirty records; unchanged sprites reuse prior-frame computed data.

Why third:

- Moves work from per-frame/per-entity to per-change/per-entity.
- Essential for large static or mostly-static scenes.

## P3 — Strong visibility culling before queueing

Outcome target: reduce `k` (visible/queued sprites), especially in large worlds.

- Use broad-phase spatial partition (uniform grid / loose quadtree / chunk bins).
- Query only camera-overlapping buckets.
- Early reject off-screen sprites before command creation.

Why fourth:

- If world is much larger than viewport, this gives multiplicative gains.
- At 50k total sprites, visible count should ideally be far lower.

## P4 — Batch/instance submission path by material/texture atlas

Outcome target: keep draw/submission overhead low as visible count rises.

- Ensure sprite texture usage is atlas-friendly to reduce texture binds.
- Keep instance buffers persistent and update only active range.
- Minimize per-command object churn; write compact struct-like arrays where possible.

Why fifth:

- GPU instancing helps, but CPU-side packing/submission must also be lean.

## P5 — Reduce memory churn and per-frame allocations

Outcome target: flatten GC spikes and improve frame pacing.

- Reuse query/result arrays and command buffers when safe.
- Avoid creating throwaway objects in inner loops.
- Keep transform/temp math objects pooled or stack-like reused scratch.

Why sixth:

- Not always biggest mean-time gain, but often critical for stable 120 FPS frame pacing.

## P6 — Optional: move non-critical prep off main thread

Outcome target: reserve main thread for minimal render-critical work.

- Candidate: precompute culling bins, animation frame indices, or static bounds out of hot path.
- Keep final render submission deterministic and lightweight on main thread.

Why last:

- Higher complexity; do only after hot-path data layout issues are fixed.

## Recommended milestones

1. **Milestone A (near-term):**
   - Incremental renderable-sprite set + reduced component lookup churn.
   - Success metric: significant drop in `storage.get` and `getComponent` samples.

2. **Milestone B:**
   - Dirty render-record cache + early visibility culling.
   - Success metric: queue/render CPU cost scales with visible sprites, not total sprites.

3. **Milestone C:**
   - Submission/batching polish + allocation minimization.
   - Success metric: stable frame pacing at large counts and fewer GC-related stalls.

## Scaling expectation for 50k

If nothing else changes, linear scaling from current numbers will not hit 120 FPS.

To make 50k plausible:

- Make work proportional to **visible + changed** sprites, not total sprites.
- Keep per-visible-sprite CPU work very small and mostly contiguous memory access.
- Ensure submission path stays batch-friendly and allocation-light.

## What to measure after each step

Track the same trace counters after each milestone:

- `world.query`
- `storage.get`
- `world.getComponent`
- `handleSpriteEntityCommand`
- `#queueSprite`
- `resolveWorldTransform2D`
- `#worldToScreen`
- GC sample share / GC pause events

Stop moving to the next milestone until the previous one shows measurable improvement in trace data.