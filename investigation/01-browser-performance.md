# Browser Performance Investigation

## Scope

This report covers the requested browser-side experiments: ECS iteration,
instance-data construction, GPU upload shapes, fixed-buffer instanced drawing,
culling order, CPU versus shader-derived motion, development versus production,
frame variance, garbage collection, and memory growth.

The pass remained read-only with respect to production code. Raw measurements
and their provenance are retained under `investigation/evidence`. Networking
was not investigated.

## Method

I inspected the live application entry point, E2E belt scene, render traversal,
sprite-record cache, WebGL batch writer, and ECS world API. I built the
production client and launched both Vite development and production-preview
servers.

For isolated browser stages, I ran Playwright Chromium against a WebGL2 canvas.
The harness uses the renderer's real 17-float (68-byte) instance stride and
tests 100k, 250k, 500k, and 1M instances. It separately measures:

- writing all 17 floats without upload;
- full `bufferData`;
- contiguous 1% and 90% `bufferSubData`;
- CPU calculation of two moving-position floats;
- scanning all instances then packing 1% visible versus packing a preculled
  1% candidate set;
- a fixed 500k instance buffer draw and shader-derived motion draw.

The retained run was deliberately bounded. Its backend is SwiftShader, and its
small sample counts are reported rather than hidden. Exact commands, failures,
and interpretation limits are in
[`evidence/benchmark-notes.md`](evidence/benchmark-notes.md). Raw values are in
[`evidence/measurements/webgl-isolation.json`](evidence/measurements/webgl-isolation.json).

## Evidence

### Isolated stage measurements

Values are browser wall-clock milliseconds. “Rebuild” writes 17 floats per
instance. “Full upload” is `bufferData` plus `gl.finish`; it has one retained
sample. Partial uploads use `bufferSubData` plus `gl.finish`. Position
calculation updates two floats. Culling is configured to retain 1%. For the
two-sample rows, the harness's percentile function reports the upper middle
sample as the median; the raw minimum and maximum values are authoritative.

| Instances | Buffer | Rebuild median | Full upload | 1% upload median | 90% upload median | CPU positions median | Scan-all cull median | Preculled pack median |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100k | 6.8 MB | 3.9 ms | 7.3 ms | 0.1 ms | 8.8 ms | 2.1 ms | 0.3 ms | <0.1 ms |
| 250k | 17.0 MB | 8.8 ms | 13.9 ms | <0.1 ms | 9.9 ms | 5.0 ms | 0.8 ms | 0.2 ms |
| 500k | 34.0 MB | 17.3 ms | 24.9 ms | 0.1 ms | 17.2 ms | 8.9 ms | 1.8 ms | 0.4 ms |
| 1M | 68.0 MB | 35.4 ms | 45.4 ms | 0.1 ms | 31.0 ms | 21.5 ms | 3.4 ms | 1.4 ms |

The two retained rebuild samples at 500k were 17.1 and 17.3 ms; at 1M they
were 34.1 and 35.4 ms. The 500k full-upload call itself had two samples of
25.0 and 26.0 ms; its one synchronized sample was 24.9 ms. These figures show
linear CPU/data-movement pressure in this environment, but they are not
application frame breakdowns.

At 500k, the single fixed-buffer draw issue sample was 0.1 ms, the single
draw-plus-finish sample quantized to 0 ms, and the single shader-derived
draw-plus-finish sample was 0.1 ms. Those values are below the timer/sample
quality needed for a GPU capacity claim. A timer-query run on physical hardware
is still required.

### Concrete application code path

The current sprite queue performs two complete component-store traversals every
rendered frame:

- `queue-sprites/index.ts:47-59` visits every `Sprite`, then every
  `AnimatedSprite`.
- `queue-sprites/manager.ts:81-98` resolves the cache entry and world transform,
  and for dynamic/animated records writes sprite and transform state before
  checking visibility.
- Static records avoid state rewriting when the cache is valid, but are still
  visited, looked up, and checked every frame.
- `webGL/api.ts:201-218` writes 17 floats for every queued visible sprite.
- `webGL/api.ts:236-254` uploads the whole batch with `bufferData` and issues
  one instanced draw.

Therefore current batching demonstrably reduces draw calls, but it does not
remove all-sprite traversal or full visible-batch CPU-to-GPU transfer.
Culling skips queue construction and packing only after a sprite has already
been reached through the ECS traversal; it is not a spatial preselection.

### Conveyor stress-scene adequacy

The existing browser E2E visual scenario creates four belts, one tracked gear,
and one motion probe (`scenes/e2e/index.ts:191-207,261-268`). It is useful for
visual correctness, not performance scale. There is no bulk belt/item fixture,
stable deterministic stress URL, or public stage-profiler interface.

### Production versus development

The production build completed successfully and produced a 384.24 kB main JS
bundle (106.59 kB gzip). Both development and production servers launched.
However, the browser scene harness did not finish entering the E2E scene during
the bounded run, so no dev/prod frame comparison is reported. Bundle size and
build success must not be treated as runtime-performance evidence.

## Required experiment matrix

| # | Experiment | Status | Evidence or missing primitive |
| ---: | --- | --- | --- |
| 1 | Iterate entities without rendering | Not retained | The E2E `UserWorld` is exposed, but scene entry timed out. A benchmark scene should expose a component-store iteration fixture and pause both update and render. |
| 2 | Fixed prebuilt instance buffer | Partial | Isolated 500k draw executed. Single sub-resolution timing on SwiftShader is inconclusive; engine has no persistent public draw primitive. |
| 3 | Rebuild without upload | Completed in isolation | 17-float rebuild: 17.3 ms median at 500k, 35.4 ms at 1M. |
| 4 | Full upload without ECS | Completed in isolation | 34 MB synchronized upload: 24.9 ms at 500k; 68 MB: 45.4 ms. Physical-GPU rerun required. |
| 5 | Update a small percentage | Completed in isolation | Contiguous 1% updates were at/below 0.1 ms timer resolution. Engine lacks stable slots/dirty ranges. |
| 6 | Update nearly all slots | Completed in isolation | 90% median: 17.2 ms at 500k and 31.0 ms at 1M. |
| 7 | Draw 500k simple instances | Executed, inconclusive | One SwiftShader sample, no GPU timer query; cannot answer “acceptable” honestly. |
| 8 | Cull before traversal | Synthetic comparison only | Preculled 1% candidate packing was 0.4 ms versus 1.8 ms scanning 500k. Engine lacks a render-facing spatial candidate index. |
| 9 | CPU positions vs shader-derived | Partial | CPU two-float calculation was 8.9 ms at 500k/21.5 ms at 1M. Shader draw executed, but GPU timing quality was insufficient. |
| 10 | Development vs production | Build only; runtime blocked | Both servers launched and production built; no trustworthy matched frame trace was retained. |

## Findings

1. **The measured isolated CPU/data-movement path already exceeds a 16.7 ms
   frame at 500k.** Rebuilding the current 68-byte layout took 17.3 ms median,
   before ECS traversal, simulation, sorting, upload, or draw. A full upload
   added about 25 ms in this SwiftShader environment.
2. **Sparse updates matter only if the renderer can preserve identity.** A 1%
   contiguous update was below 0.1 ms resolution while a 90% update took
   17.2 ms at 500k. The current renderer has one growing CPU batch and replaces
   the whole GPU buffer, so it cannot exploit this difference.
3. **Culling is late.** Current culling avoids packing/drawing culled sprites,
   but not the Sprite/AnimatedSprite store traversal. The isolated 1%-visible
   test reduced packing from 1.8 to 0.4 ms at 500k when a candidate list was
   already available. This excludes the cost of building/maintaining that list.
4. **Conveyor visual transforms are CPU state today.** The renderer consumes
   ordinary transforms. The isolated calculation of only two position floats
   cost 8.9 ms at 500k. Stable belt/path/lane/base-distance data plus a time
   uniform could remove that per-frame CPU position write, but GPU cost remains
   unmeasured.
5. **There is no measured application frame-time breakdown.** Total frame,
   simulation, ECS query, render extraction, batch construction, GC, heap
   growth, frame variance, React overhead, and dev/prod delta remain unanswered.
   It would be misleading to name a dominant application bottleneck from the
   isolation harness.
6. **A fixed-buffer 500k capacity claim is not yet supported.** The draw call
   executed, but one coarse CPU timing on software rendering is not a GPU
   measurement.

## Confidence level

- **High:** code-path statements about traversal order, late culling, 17-float
  packing, whole-batch `bufferData`, and the four-belt E2E fixture.
- **Medium:** linear scaling and relative sparse-versus-nearly-all upload,
  rebuild, CPU-position, and preculled-candidate results. They are real browser
  measurements but use small samples and SwiftShader.
- **Low / unanswered:** physical GPU draw throughput, full application
  breakdown, GC/memory growth, dev/prod overhead, and large conveyor simulation.

## Recommended future changes

These are profiling-enablement and evidence-driven next steps, not proposed
implementation in this investigation:

1. Add an opt-in production-build benchmark route/scene that deterministically
   creates 100k/250k/500k/1M renderable items and belts without persistence,
   networking, editor UI, or manual clicks. Keep it out of the normal runtime.
2. Add browser User Timing marks around update systems, each ECS query family,
   render extraction, command/batch construction, typed-array writes, uploads,
   and draw submission. Add counters for visited, culled, packed, uploaded,
   draw calls, bytes, and dirty slots.
3. Run the exact matrix on a physical target GPU with Chrome tracing,
   `EXT_disjoint_timer_query_webgl2`, allocation sampling, and heap snapshots;
   retain at least 120 steady-state frames after warmup.
4. Only after that baseline, prototype stable render slots plus dirty ranges in
   the benchmark branch. Compare 1%, 10%, 90%, and structural churn separately.
5. Add a render-facing spatial candidate source so culling can reduce traversal,
   then measure its update/maintenance cost. Do not call late per-entity bounds
   checks “culling before traversal.”
6. Prototype conveyor shader derivation using stable path/lane/base-distance,
   sprite, speed, and a reference simulation tick plus optional render
   interpolation. Compare it against CPU transform writes without changing or
   skipping authoritative simulation and future catch-up ticks.

## Explicitly rejected assumptions

- JavaScript or ECS is the dominant application bottleneck: **not established**.
- A single instanced draw proves 500k is acceptable: **rejected**.
- Batching means CPU-efficient rendering: **rejected by the code path**.
- Persistent buffers automatically help if nearly all items change:
  **rejected by the 90% upload result**.
- Culling currently prevents all-entity traversal: **rejected by the queue
  loops**.
- SwiftShader timings predict a physical GPU: **rejected**.
- The four-belt correctness fixture is a stress scenario: **rejected**.
- Production must be faster than development: **not measured**.

## Unanswered questions

- What is the steady-state and spike frame-time breakdown in the real
  application at each target entity count?
- How much time belongs to conveyor simulation, ECS lookup, hierarchy
  transforms, render extraction, sorting/queueing, packing, upload, and GPU?
- What are GC frequency, allocation stacks, retained heap growth, and GPU memory
  growth?
- Can the target physical GPU draw the required textured/alpha-blended 500k
  items at the chosen resolution?
- What percentage of items and render fields truly change per simulation tick?
- Does a spatial candidate index save more traversal time than it costs to
  maintain under belt/item movement?
- How does editor/React/dev tooling alter frame variance relative to the
  production benchmark build?
- Is one million renderable entities compatible with the ECS entity-ID ceiling
  once cameras, belts, regions, and other entities are included?
