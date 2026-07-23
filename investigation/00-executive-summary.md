# Executive Summary

## Scope and evidence boundary

This read-only investigation assessed the non-networking ECS, simulation,
rendering, conveyor, world, allocation, and complexity paths at source commit
`3f8b91e`. Seven independent reports were produced. No production code was
changed.

The investigation produced two kinds of current measurements:

1. a Bun 1.2.18 microbenchmark that extracts the current ECS query and direct
   iteration algorithms; and
2. a headless Chromium WebGL2 isolation harness using the renderer's current
   17-float/68-byte instance stride.

They are different workloads and runtimes. Their timings are **not additive**
and do not constitute an application frame-time breakdown. The current
application could be built and served, but its E2E scene did not expose the
browser harness within the bounded attempts. Consequently, current full-frame,
simulation, GC, heap-growth, frame-variance, and matched development/production
runtime measurements remain open.

## Method

Seven subagents independently traced browser performance, the render pipeline,
ECS/allocations, defensive complexity, structural complexity, world ownership,
and architectural strengths. A separate evidence audit checked the reports for
unsupported claims and contradictions. Source evidence was cross-checked
against the retained benchmark inputs/results before consolidation.

## Confirmed product direction

The following constraints were confirmed after the investigation:

- Houses and dungeons are “instanced” in the MMO sense: entering one teleports
  the player into a mutually exclusive gameplay space, and the rest of the world
  is absent from that player's presentation and local interaction domain.
  Other relevant spaces still continue simulating concurrently.
- A single ECS world with widely separated coordinate islands is one plausible
  implementation, but is not yet a decision. A region transform or another
  same-world representation may be cleaner; alternatively, multiple ECS worlds
  could be scheduled concurrently. Product behavior does not settle ECS
  ownership.
- Simulation is intended to move from wall-clock deltas to deterministic ticks.
  At normal pace the client advances a tick per frame; when behind the
  authoritative server tick it may execute additional catch-up ticks. The
  intended model keeps client state aligned by tick pace/catch-up rather than
  routine simulation-state transfer. This is a future constraint, not part of
  the current performance task; networking implementation was not investigated.

“Instanced sprite draw” elsewhere in these reports is the unrelated WebGL
rendering term and remains a valid renderer finding.

The deterministic-tick direction strengthens the recommendation to retain
ordered system execution and explicit step seams. Future render interpolation
or shader-derived conveyor motion should consume simulation tick/reference data
rather than becoming a second wall-clock simulation.

## Executive conclusion

The evidence does not justify an engine or ECS rewrite. It does justify a
smaller sequence:

1. make a realistic large-scene benchmark and stage profiler a maintained
   engine capability;
2. fix the entity allocator's near-1M hard capacity limit;
3. replace the current focus/visibility coupling with explicit
   `activeGameplaySpace` and `simulationSpaces`, then choose the smallest ECS
   ownership model that runs every simulation space;
4. remove measured or source-proven per-frame waste while retaining the
   sparse-set ECS, phase boundaries, pools, and WebGL instanced draw primitive;
5. prototype stable render slots, partial/full upload crossover, and spatial
   preselection in isolation; and
6. only then decide whether conveyor visuals need shader-derived path motion or
   whether selected high-volume fields need packed storage.

At 500k instances, the isolated browser harness already found two material
costs before ECS traversal or gameplay simulation: writing the current
17-float layout took 17.1–17.3 ms, and one synchronized 34 MB upload took
24.9 ms on SwiftShader. These values do not predict a physical GPU, but they
prove that current-layout CPU packing and full transfer are independently large
enough to require attention at the target scale.

## Evidence

### Browser isolation

The retained run used Chromium with ANGLE/Vulkan SwiftShader at 1280 × 720.
Most rows have only one or two samples; ranges are shown instead of treating
the upper of two samples as a stable median.

| Instances | Instance data | Rebuild range | Full upload + finish | 1% contiguous update | 90% update range | Two-float CPU motion range |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100k | 6.8 MB | 3.9 ms | 7.3 ms | 0–0.1 ms | 0.5–8.8 ms | 2.0–2.1 ms |
| 250k | 17.0 MB | 8.8 ms | 13.9 ms | <0.1 ms | 9.1–9.9 ms | 4.7–5.0 ms |
| 500k | 34.0 MB | 17.1–17.3 ms | 24.9 ms | 0–0.1 ms | 16.0–17.2 ms | 8.6–8.9 ms |
| 1M | 68.0 MB | 34.1–35.4 ms | 45.4 ms | 0–0.1 ms | 30.5–31.0 ms | 20.0–21.5 ms |

For a synthetic 1%-visible case at 500k, scanning all candidates and packing
the visible entries took 1.5–1.8 ms; packing an already-preselected candidate
list took 0.3–0.4 ms. This excludes the cost of maintaining the candidate list,
but confirms that current late culling and true preselection are different
operations.

A prepared 500k draw executed, but the single CPU-wall-clock samples were below
useful timer resolution. They used a position-only shader on software rendering
and no GPU timer query. They do **not** answer whether target physical hardware
can draw 500k textured, blended instances acceptably.

### ECS algorithm microbenchmark

The ECS harness measured the current algorithmic shapes, not a browser frame:

| Entities | `query(A)` + `get(A)` | `forEach1(A)` | `query(A,B)` + 2 gets | `forEach2(A,B)` |
| ---: | ---: | ---: | ---: | ---: |
| 100k | 3.12 ms | 0.47 ms | 8.94 ms | 2.34 ms |
| 250k | 12.77 ms | 1.23 ms | 38.40 ms | 9.81 ms |
| 500k | 42.88 ms | 2.66 ms | 111.37 ms | 38.27 ms |
| 1M | 104.83 ms | 6.24 ms | 277.35 ms | 87.78 ms |

With 500k A components but only 50k B components, multi-component direct
iteration fell to 4.65 ms. This supports two conclusions: direct component
iteration is worth preferring in measured hot loops, and cost depends on the
smallest candidate store and match density rather than entity count alone.
It does not prove the application spends these exact times in ECS.

### Historical application evidence

Repository documentation records a March 2026 development-server result of
approximately 440 ms per frame for 500k visible entities on a related current-
family render path. The raw trace and old benchmark scene are absent, and the
branch has changed. This is evidence that the historical fused path failed at
500k and appeared CPU-heavy; it is not a current measurement or a GPU-capacity
result.

## Findings

### Dominant source-proven costs and scale blockers

1. **Entity capacity is a correctness blocker.** Entity indices use 20 bits,
   index zero is skipped, and destroyed indices are not reused. The process can
   create at most 1,048,575 indices over its lifetime. A one-million-visible
   scene has essentially no room for belts, cameras, helpers, churn, or reloads.
2. **Batching reduces draw calls, not the full CPU path.** Every `Sprite` and
   `AnimatedSprite` is traversed; visible entries become commands; all 17
   instance floats are repacked; and each active batch is supplied again with
   `bufferData`.
3. **Culling is late.** Per-sprite visibility checks save downstream command,
   pack, upload, and draw work, but they occur after whole-store traversal and
   transform/cache access. There is no render-facing chunk or spatial candidate
   source.
4. **Transforms perform broad work.** Snapshot queries allocate result arrays.
   World-transform synchronization scans global stores and reconstructs
   parent-to-child arrays every update.
5. **Conveyor presentation duplicates work and state.** Belt occupancy,
   per-slot progress, item `Parent`, item `Transform2D`, derived world transform,
   render record, and packed GPU instance represent overlapping facts. Chains
   are traversed for motion and then visual synchronization; rail positions are
   CPU-derived and written as ordinary item transforms.
6. **High-frequency derived mutations pass through persistence machinery.**
   Tracked transform mutation checks serialization metadata and can produce
   dirty work even where the field is derived presentation state.
7. **Current world routing obscures ownership.** Scene and spatial-context
   registries, two wrapper identities, focus switching, whole-world rendering,
   wrapper-keyed caches, entity moves, persistence world IDs, and editor scans
   conflate the one presented gameplay space with the set of concurrently
   simulated spaces. A one-world model removes most of this; a multi-world
   model still needs a much narrower explicit scheduler.

## Architecture to retain

- Dense component/entity arrays with sparse membership and smallest-store query
  selection.
- `forEach1/2/3` direct iteration, extended only for measured concrete needs.
- Explicit update/render/pass boundaries and ordered tick/step seams.
- Frame pools, allocator resets, and shared scratch objects in demonstrated hot
  paths.
- The persistent sprite-record concept as a possible ownership boundary,
  simplified now and connected to real dirty ranges only if experiments win.
- The WebGL instanced sprite shader/draw primitive.
- CPU authority for conveyor occupancy, blocking, transfers, and side-loading.
- Continued simulation for relevant off-screen MMO-style instance spaces.
- Entry/portal spaces as gameplay data, independently of whether their ECS
  storage uses one world or several simulation containers.

## Complexity and invariant conclusions

The defensive audit classified 17 concrete sites. The most valuable direction
is to assert owned storage/hierarchy invariants at mutation boundaries and stop
silently skipping corrupted aligned arrays or required query results inside
hot loops. Legitimate loading, asset, persistence, headless, and first-render
absence must remain recoverable.

The highest structural simplifications are:

- remove unused `RenderQueue` flat-command views and weak bag command shapes;
- simplify sprite version/dirty vocabulary that has no downstream GPU
  consumer, adding purpose-built dirty tracking later only if the slot
  prototype proves useful;
- make belt variant/direction, topology, and structural mutation ownership
  canonical rather than repaired across several helpers; and
- separate the single `activeGameplaySpace` used by presentation/local
  interaction from `simulationSpaces`, then collapse storage ownership to one
  world only if the coordinate-island/region-transform model proves suitable.

These are primarily correctness and cognitive-complexity changes until a
profile proves a frame-time effect.

## Recommended future changes

The smallest evidence-driven sequence is:

1. establish a maintained application-scale benchmark and profiler;
2. fix entity ID reuse/capacity;
3. separate presentation focus from simulation scheduling and choose between
   one-world regions and a minimal concurrently scheduled multi-world model;
4. use existing direct iteration and remove proven hot-path/ownership waste;
5. make transform and persistence work dirty-driven; and
6. choose render slots, spatial preselection, and conveyor shader work only
   from isolated target-hardware experiments.

Exact stages, risks, exit criteria, and the three requested scopes are in
`08-proposed-consolidation.md`.

## Explicitly rejected assumptions

- The ECS or JavaScript is already proven to be the dominant application
  bottleneck.
- WebGL instancing or one prepared draw proves that 500k rendering is
  acceptable.
- The Bun ECS and SwiftShader browser timings can be added into a frame budget.
- Persistent buffers solve moving items when nearly every slot is dirty.
- Current culling prevents whole-store traversal.
- MMO-style instance behavior by itself proves either one-world or multi-world
  ECS ownership.
- Every source-visible allocation survives JIT optimization or creates measured
  GC pressure.
- A large rewrite is justified before the missing full application baseline.

## Required-question status

| # | Question | Status | Answer |
| ---: | --- | --- | --- |
| 1 | Measured frame-time breakdown at large counts | **Unanswered** | No current large application fixture or retained app trace. |
| 2 | Time spent merely iterating entities | **Partial** | Extracted ECS algorithm: `forEach1` 2.66 ms at 500k and 6.24 ms at 1M; not application/browser time. |
| 3 | Time building render batches | **Partial** | Isolated 17-float rebuild 17.1–17.3 ms at 500k; current command/extraction stages were not separately timed. |
| 4 | Time uploading to GPU | **Partial** | One SwiftShader synchronized result: 24.9 ms for 34 MB at 500k; physical GPU/application path unknown. |
| 5 | Can GPU draw 500k prepared items? | **Unanswered** | Draw executed, but software backend, one sub-resolution sample, no timer query, texture, blending, or real shader workload. |
| 6 | Does culling reduce traversal? | **Answered for current source** | No. It skips work only after all sprite-store entries are reached. Synthetic preselection was cheaper, excluding index maintenance. |
| 7 | Are conveyor transforms recalculated unnecessarily? | **Answered structurally** | Yes for presentation: CPU rail position mutates item transforms, world transforms propagate, then renderer repacks position. Performance share is unmeasured. |
| 8 | Can movement derive from stable belt/item data? | **Feasible, unvalidated** | Current CPU formulas show path/lane/base-distance/time/speed are sufficient; congestion and transfer visual contracts need a prototype. |
| 9 | Which data genuinely changes each frame? | **Partial** | Simulation interpolation/time changes; current renderer rewrites every visible instance. Real structural/dirty-rate distributions were not measured. |
| 10 | Which data could remain persistent? | **Answered as candidates** | Material/UV/size/tint/path/lane/parent reference and stable slots; transforms/progress depend on chosen extrapolation contract. |
| 11 | Where are per-frame allocations? | **Answered statically, not profiled** | Query arrays, rebuilt child arrays, iterator results, world lists, culling/screen objects, commands and views. JIT elimination/GC impact unknown. |
| 12 | Unsupported-future abstractions | **Partially answered** | Duplicate queue views, speculative render metadata, and generic focus/visibility routing are candidates. The required simulation-space ownership model remains undecided. |
| 13 | Complexity removed by one world | **Answered conditionally** | If selected, one world removes two registries/wrappers, focus switching, cross-world moves/lookups, wrapper-keyed caches, world IDs in persistence, and editor multi-world scans. |
| 14 | Which null/error branches are real? | **Answered by classification** | Loading, assets, persistence misses, headless operation, first render, and user transitions can be operational. |
| 15 | Which become types/assertions/failures? | **Answered by classification** | Dense-store alignment, query-proven presence, required parent/topology ownership, initialized manager state, and invalid command shapes should be enforced at boundaries. |
| 16 | Systems worth retaining | **Answered** | Sparse-set/direct iteration, lifecycle/pass seams, pools/scratch, record concept, WebGL instanced drawing, fixed lane semantics, CPU simulation authority. |
| 17 | Smallest meaningful sequence | **Answered as a plan** | Maintained benchmark → ID capacity → separate presentation/simulation scopes → choose minimal storage ownership → low-risk waste removal → renderer experiments. |

## Unanswered questions

The main remaining evidence gaps are:

- the current full application stage breakdown and dev/production delta;
- physical-GPU prepared draw and upload performance;
- realistic conveyor occupancy, chain, blocked-item, and dirty-rate
  distributions;
- GC allocation stacks, retained heap, and memory growth;
- the maintenance cost of a render-facing spatial candidate index; and
- the remaining implementation decisions listed at the end of
  `08-proposed-consolidation.md`.

## Confidence

- **High:** source-path, ownership, allocation-site, capacity, culling-order,
  full-upload, and complexity findings.
- **Medium:** relative scaling of isolated CPU packing, extracted ECS algorithms,
  and sparse versus nearly-all updates.
- **Unknown:** current end-to-end bottleneck shares, physical GPU throughput,
  realistic conveyor dirty rates, GC/heap behavior, and dev/prod delta.

The next task should not be a broad refactor. It should establish the missing
application baseline and then implement one independently verifiable stage from
`08-proposed-consolidation.md`.
