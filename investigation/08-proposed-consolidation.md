# Proposed Consolidation

## Scope

This is a staged future plan, not an implementation record. It combines reports
01–07 while preserving their evidence boundary: current browser and ECS
measurements are isolated and non-additive, and there is no current full
application frame breakdown.

The plan deliberately retains the sparse-set ECS, engine phase/pass boundaries,
pooling, instanced sprite primitive, and CPU-authoritative conveyor simulation.
It removes or narrows ownership and metadata before introducing new scale
mechanisms.

## Method

Recommendations were ranked by measured impact where measurements exist, then
by complexity removed, implementation cost, risk, and ability to verify the
change independently. Source-proven complexity and correctness findings are not
presented as measured frame-time wins. Unknown renderer decisions remain
experiments with explicit exit criteria.

## Evidence

The plan relies on:

- the retained SwiftShader isolation results for packing, upload shapes,
  sparse/nearly-all updates, simple motion writes, and synthetic preselection;
- the retained Bun extracted-algorithm results for query/get versus direct
  iteration;
- direct source traces for culling order, 17-float packing, full `bufferData`,
  transform/conveyor work, entity capacity, and world ownership; and
- the seven detailed reports for confidence and rejected assumptions.

It does not treat the historical 500k result as current, combine synthetic
timings into a frame, or assume physical-GPU capability.

## Confirmed constraints

- Houses/dungeons are MMO-style instances: exactly one
  `activeGameplaySpace` is presented and locally interactive for the player.
- Every relevant entry in `simulationSpaces` continues ticking concurrently,
  including spaces not currently presented.
- ECS ownership is undecided. Candidate implementations are one world with
  coordinate islands/region transforms, or a minimal set of concurrently
  scheduled ECS worlds.
- WebGL instanced drawing and aggregate conveyor rendering elsewhere in this
  plan are unrelated renderer concepts.
- A future deterministic scheduler will normally advance one tick per frame
  and execute additional catch-up ticks when the client is behind the
  authoritative server tick. The intended model aligns client state through
  tick pace/catch-up rather than routine simulation-state transfer. That
  migration is out of the current scope, networking implementation remains
  excluded, and new presentation contracts should use reference ticks rather
  than a separate wall clock.

## Findings

### Priorities

| Priority | Area | Measured or evidenced problem | Proposed future change | Expected effect | Risk |
| ---: | --- | --- | --- | --- | --- |
| 1 | Benchmark and profiling seam | Current app frame stages, GC, memory, dirty rate, and dev/prod delta are unknown | Add an opt-in production benchmark scene for 100k/250k/500k/1M with stage marks/counters, GPU timer queries, allocation sampling, heap snapshots, and retained artifacts | Establishes the actual bottleneck and regression baseline | Low runtime risk; moderate fixture effort |
| 2 | Entity IDs | Hard 1,048,575 lifetime-created index ceiling with no reuse | Add a generation-safe free list or deliberately widen/change the ID representation; test churn and one-million-visible plus support entities | Removes an immediate correctness/capacity failure | Medium; identity semantics are foundational |
| 3 | Gameplay-space ownership | Current wrappers, focus switching, visibility routing, and simulation policy conflate one presented space with all simulated spaces | Introduce explicit `activeGameplaySpace` and `simulationSpaces`; compare one-world regions with a minimal concurrently scheduled multi-world model, then delete routing not required by the selected model | Clear ownership and a correct off-screen simulation path | Medium-high; storage, teleport, persistence, and lifecycle |
| 4 | Existing hot-loop primitives | Extracted 500k `query(A)+get(A)` was 42.88 ms versus 2.66 ms for `forEach1`; source shows query arrays and repeated Maps | Convert measured query/get loops, beginning with transform snapshots, to existing direct iteration; add only concrete arities later | Removes result copying and redundant lookup without changing ECS | Low-medium; preserve mutation/iteration semantics |
| 5 | Invariants and low-risk render complexity | Hot loops silently skip owned-state corruption; queue keeps unused views; render metadata has no GPU consumer | Assert storage/topology invariants at ownership boundaries, strengthen command/query types, remove unused queue views, and simplify current version/mask state | Less branching and state; failures become visible; smaller API | Low-medium; performance effect is unmeasured |
| 6 | Transform and persistence ownership | Global transform scans, rebuilt child arrays, duplicate local/world representations, and high-frequency derived mutations enter dirty serialization | Persist parent→children adjacency, track dirty subtrees, and classify fields as authoritative/persisted/derived/render-only | Reduces broad update work, allocations, and unnecessary dirty traffic | Medium; hierarchy and save/load correctness |
| 7 | Renderer stage isolation | Current 500k layout rebuild took 17.1–17.3 ms and one SwiftShader 34 MB upload took 24.9 ms | Add prepared-draw, pack-only, upload-only, and 1/10/50/90/100%-dirty experiments on target physical hardware | Determines whether slots, split streams, or full upload are worthwhile | Low for harness; hardware-dependent result |
| 8 | Stable render slots | Current path rebuilds commands/17 floats and replaces complete batch contents; 1% versus 90% isolated uploads differ materially | Prototype generation-safe stable slots for one material, coalesced dirty ranges, compact active ranges, and full-upload fallback | Can reduce CPU packing and transfer when dirtiness is sparse | Medium-high; ordering, fragmentation, churn |
| 9 | Spatial preselection | Current culling occurs after all sprite entries are traversed; synthetic 500k/1%-visible packing was 1.5–1.8 ms scan-all versus 0.3–0.4 ms preselected | Make `activeGameplaySpace` the coarse render selection, then prototype chunk/cell candidates inside it and measure maintenance cost | Prevents off-instance render traversal and scales the active space by visible candidates | Medium; ownership-model integration and moving-index maintenance |
| 10 | Conveyor presentation | CPU rail positions mutate transforms, propagate hierarchy, and are repacked; isolated two-float work was 8.6–8.9 ms at 500k | Prototype an aggregate carried-item source with stable belt/path/lane/base-distance/material plus reference tick/speed; keep every authoritative item simulation and catch-up tick on CPU | May remove per-item presentation transforms and most steady-motion writes | High; blocking, transfer interpolation, ordering |
| 11 | Selective packed storage | Component objects and Maps are costly at dense scale, but sparse-set selection/direct loops remain sound | Pack only measured high-volume scalar fields, considering a hybrid sparse index for dense stores | Better locality and memory only where density justifies it | High; broad API and migration cost |

Priorities 7–10 are experiments before architecture commitments. If nearly all
slots are dirty, the correct result may be a compact dynamic stream and full
upload rather than partial ranges. If the physical GPU cannot meet the prepared
draw target, CPU-side consolidation alone cannot satisfy the visible-count goal.

## Recommended future changes

### Stage 0 — Establish the baseline

1. Add a deterministic benchmark entry that creates realistic proportions of
   belts, occupied items, transforms, helpers, and sprites at each target count.
2. Expose pause/step controls and independent update/render stage toggles.
3. Record total and per-system update time; ECS candidate/result counts; render
   visits, culls, record hits, commands, instances, bytes, uploads, and draws;
   GPU timer queries; long frames; GC/allocation stacks; retained heap; and
   memory growth.
4. Run matched development and production builds on target physical hardware.
5. Retain raw traces, environment metadata, screenshots, and at least 120
   warmed steady-state frames.
6. Keep current-runtime results separate from the future deterministic-tick
   migration. When that scheduler exists, benchmark normal one-tick frames and
   multi-tick catch-up bursts independently.

Exit criterion: questions 1–5 and the dirty-rate portions of questions 9–11 in
`00-executive-summary.md` have current application answers.

### Stage 1 — Correct capacity and choose gameplay-space ownership

1. Fix ID reuse/capacity independently and stress entity churn.
2. Represent the confirmed behavior explicitly: one `activeGameplaySpace` and
   all concurrently ticking `simulationSpaces`.
3. Prototype one ECS world using coordinate islands or region transforms and
   compare it with a minimal multi-world scheduler.
4. Select the model with the smallest ownership/lifecycle surface that
   preserves teleport semantics, persistence, and off-screen simulation.
5. Remove current default/focused/visible/simulated routing that is not required
   by the selected model.
6. Give rendering, input, collision/local interaction, editor, and persistence
   one unambiguous way to resolve the active space and simulation owner.

Exit criterion: one presentation ownership path and one explicit simulation
scheduler, with instance transitions, non-presented space progression, and
reset/disposal covered by focused tests.

### Stage 2 — Remove waste without redesigning foundations

1. Convert profiled query/get loops to direct component-bearing iteration.
2. Move impossible storage/query/hierarchy checks to ownership boundaries.
3. Remove the queue's unused flat view and strengthen render command shapes.
4. Simplify sprite version/mask state that currently has no downstream
   consumer. If stable-slot experiments later need dirty state, add tracking
   whose fields and consumer are explicit rather than preserving speculative
   vocabulary.
5. Replace per-sprite culling/screen temporary objects only where the allocation
   profile confirms material garbage.
6. Make belt direction/variant and leaf/topology facts canonical; route
   structural belt mutations through one owner without changing motion phases.

Exit criterion: behavior tests pass, full workspace typecheck passes, and the
Stage 0 profile shows the expected stage/allocation change.

### Stage 3 — Make transforms structural and dirty-driven

1. Maintain parent-to-children adjacency on `Parent` structural changes.
2. Track changed local transforms and propagate affected subtrees.
3. Separate authoritative/persisted state from derived world transforms and
   render-only item presentation so high-frequency derivation does not
   automatically create persistence work.
4. Re-profile transform snapshot, hierarchy sync, conveyor motion, dirty
   serialization, and GC independently.

Exit criterion: fewer visited transforms/allocated child arrays/dirty records
on representative workloads, with unchanged transform and persistence tests.

### Stage 4 — Choose the renderer architecture from isolated results

1. Measure prepared fixed-buffer drawing with the real textured/blended shader
   and GPU queries.
2. Prototype stable slots for one material behind the existing `Renderer2D`
   boundary.
3. Compare sparse coalesced updates with nearly-all-dirty full orphan/upload.
4. Compare interleaved 17-float data with split stable/material and
   dynamic/transform streams.
5. Preserve the existing instanced draw and record cache where they remain
   useful; delete duplicate command reconstruction only after the slot owner can
   replace it.

Exit criterion: a documented crossover policy selects partial versus full
updates, and prepared 500k capacity is known on target hardware.

### Stage 5 — Add scale-specific selection and conveyor rendering

1. Select only `activeGameplaySpace` for rendering, then add chunk/cell
   candidates inside that space if it remains large. Candidate selection
   affects presentation, not which spaces/entities simulate.
2. Measure index maintenance under representative item and belt motion.
3. If conveyor transform/presentation remains dominant, prototype stable
   carried-item slots and shader path evaluation from reference ticks.
4. Author CPU corrections on spawn, transfer, block/unblock, speed/path change,
   catch-up, and simulation correction; never let visual interpolation
   authorize gameplay transfers or replace an authoritative simulation tick.
5. Pack ECS fields only when the post-render/post-transform profile still shows
   component layout or Map access as a dominant cost.

Exit criterion: each added mechanism removes more measured cost/complexity than
it introduces and has an independent fallback or comparison.

## Conditional API consolidation for one world

If coordinate islands or region transforms make one ECS world the selected
model, remove rather than rename multi-world routing:

- delete world registries, `defaultWorldId`, active-world IDs, additional-world
  load/unload/register APIs, and `setActiveWorld`;
- delete cross-world entity move APIs and `worldId` from components/diff
  commands;
- replace visible/simulated world providers with the direct world;
- collapse wrapper-keyed render/physics caches to instance-owned state;
- serialize one world rather than reconcile a `worlds[]` collection; and
- remove editor world dropdown/context plumbing.

Sequential scene replacement can remain if production requires it. Spatial
regions/chunks may also remain or be added inside the one world for measured
culling, loading, or simulation.

If several ECS worlds remain, do not apply this deletion list. Replace the
current overlapping identities with one explicit space identity, schedule every
`simulationSpace`, and render only `activeGameplaySpace`.

## Explicitly rejected assumptions

- The current evidence supports a wholesale ECS or renderer rewrite.
- One million entities alone explains cost without workload composition.
- Current batching eliminates traversal, packing, or transfer.
- A stable GPU buffer is sufficient when nearly all item data changes.
- Late per-entity visibility checks are equivalent to spatial preselection.
- Shader-derived presentation removes CPU gameplay authority.
- MMO-style instancing proves that one ECS world or multiple ECS worlds is the
  correct storage model.
- One active/presented gameplay space means other relevant spaces may stop
  simulating.
- Current sprite version/mask metadata must be preserved for a future slot
  design despite having no present downstream consumer.
- Source-proven complexity cleanup should be sold as a measured performance
  improvement.

## Verification strategy

Each stage must be independently comparable against the Stage 0 scenario:

| Stage | Primary verification |
| --- | --- |
| Capacity | Create/destroy/reuse beyond 1,048,575 lifetime operations; stale generations rejected |
| Gameplay-space ownership | Instance teleport/presentation/local-interaction behavior; every non-presented simulation space keeps progressing; reset/disposal and persistence work under the selected ECS model |
| Direct iteration/invariants | Existing ECS/system tests plus candidate/result/allocation counters |
| Transform ownership | Parent change, deep hierarchy, deletion/reparent, interpolation, save/load tests and visited-node counts |
| Render slots | Byte/upload/draw counters, GPU timers, structural churn, ordering and texture/layer correctness |
| Spatial preselection | Visible equivalence, candidate count, maintenance time, camera movement and moving entities |
| Conveyor shader | Occupancy/transfer authority tests, blocked queues, turns, side loads, multi-tick catch-up, correction error and visual comparisons |

Every stage should finish with the full workspace typecheck required by the
repository. Performance comparisons should use production builds after warmup,
with raw evidence retained.

## Recommended scopes

### Minimum intervention

Changes:

- add the maintained large-scene benchmark, stage counters, traces, GPU timers,
  memory/GC capture, and dev/prod comparison;
- fix entity index reuse/capacity;
- convert only profiled query/get loops to direct iteration;
- remove proven unused queue views and strengthen impossible-state boundaries;
- rerun the unchanged architecture at all target counts.

Deliberately leaves alone:

- multiple-world behavior;
- transform hierarchy architecture;
- general component layout;
- render slot/buffer architecture;
- conveyor simulation and rendering.

This is the lowest-risk scope that produces trustworthy decisions and removes
the immediate one-million-entity correctness limit.

### Practical first refactor

Changes:

- everything in Minimum intervention;
- explicit `activeGameplaySpace` and concurrently ticked `simulationSpaces`;
- the selected one-world-region or minimal multi-world scheduler model;
- mutually exclusive instance presentation, teleport, and local-interaction
  behavior;
- unambiguous renderer, physics, editor, and persistence ownership;
- persistent transform adjacency and dirty-subtree propagation;
- authoritative/persisted/derived/render-state classification;
- low-risk conveyor fact/structural-owner simplification;
- isolated stable-slot/full-versus-partial renderer prototype for one material.

Deliberately leaves alone:

- wholesale ECS replacement;
- generic chunk/region framework;
- packed components outside measured high-volume fields;
- GPU-authoritative simulation;
- a general renderer rewrite;
- conveyor shader movement unless the new profile justifies it.

This is the recommended scope: it removes the largest unsupported ownership
complexity while preserving the engine's sound boundaries and creates one
bounded renderer experiment.

### Longer-term scale architecture

Changes, only after the practical refactor is measured:

- production stable slots with sparse dirty ranges and a nearly-all-dirty full
  upload fallback;
- split stable/material and dynamic instance streams where target hardware
  measurements win;
- render-facing chunk/cell candidate sources inside `activeGameplaySpace`;
- aggregate conveyor-item rendering with shader-derived visual path motion and
  CPU-authored tick references/corrections;
- selective packed scalar storage/sparse indexes for confirmed dense hot
  components; and
- distant/coarse representation if product requirements do not need every item
  individually distinguishable.

Deliberately leaves alone:

- CPU authority for occupancy, blocking, transfers, and gameplay;
- per-entity simulation for every relevant entity, including entities omitted
  from render candidates or represented coarsely on screen;
- the engine's update/render/pass seams;
- the sparse-set ECS for component classes that do not justify packed storage;
- ownership models beyond the one selected in the practical refactor; and
- abstractions without a measured consumer.

This scope is capable of addressing both CPU traversal/data movement and
mostly-off-screen spatial scale, but it must be chosen from physical-hardware
and realistic-workload evidence rather than entity count alone.

## Unanswered questions

1. Should gameplay spaces use separate ECS worlds, distant coordinate islands,
   or same-world region transforms?
2. Can existing local snapshots be invalidated during the gameplay-space
   ownership migration?
3. Are one million individually distinguishable visible carried items a real
   product requirement, or may distant items use an aggregate/coarse
   render representation while retaining their simulation?
4. For the future deterministic scheduler, what tick rate, catch-up budget,
   input history, RNG guarantees, and render interpolation are required?

These decisions affect the practical-refactor boundary but do not block the
minimum profiling and entity-capacity work.

## Confidence

- **High** for the entity-capacity requirement, conditional complexity removed
  by one-world storage, current render traversal/upload behavior, culling order,
  and the value of retaining existing phase/ECS/WebGL-instancing foundations.
- **Medium** for direct-iteration, transform-adjacency, and low-risk complexity
  priorities until the maintained application profile quantifies their share.
- **Unknown until experiment/decision** for ECS gameplay-space ownership,
  physical-GPU capacity, stable-slot crossover, spatial-index payoff,
  shader-derived conveyor correctness/performance, and packed-component need.
