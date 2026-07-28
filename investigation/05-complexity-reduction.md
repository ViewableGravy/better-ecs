# Complexity Reduction Investigation

## Scope

This report identifies the highest structural and cognitive complexity in the ECS, rendering, conveyor, and
world/scene paths. It asks why each area is difficult to understand or change, then recommends the smallest
behavior-preserving simplification.

This is a read-only source investigation. Production code, tests, configuration, and networking were not changed.
Renderer and ECS behavior was cross-checked against `02-render-pipeline.md` and `03-ecs-and-allocations.md`; this
report does not repeat their performance conclusions.

## Method

1. Traced mutable state from its writers to every production reader.
2. Traced ownership-changing operations (belt placement/removal, item transfer, world focus, render queue
   construction) through their callers and downstream effects.
3. Searched for public APIs and metadata with no production consumer.
4. Compared representations of the same fact to find synchronization obligations.
5. Used module size and branch density only as navigation aids. A large, cohesive calculation was not classified
   as complex solely because it is long.
6. Checked whether apparent abstractions serve current behavior before proposing removal.

## Evidence summary

| Area | Concrete complexity evidence | Main ownership problem |
| --- | --- | --- |
| Conveyor model | `variant`, `tailDirection`, and `headDirection` represent the same flow; `isLeaf` and `TransportBeltLeaf` represent the same anchor status (`src/app/client/src/components/conveyor-belt.ts:22-29`, `49-74`) | No single canonical representation is enforced |
| Conveyor structural mutation | One placement/change can run variant convergence, reconnect graph edges, traverse whole connected components, maintain transfer blocking, and synchronize decoration entities (`TransportBeltAutoShapeManager.ts:33-82`; `TransportBeltConnectionUtils.ts:144-225`, `351-492`) | A topology mutation is spread across three managers and visual side effects |
| Conveyor motion | A reusable stateful iterator feeds a reusable stateful motion object, traverses each chain twice, then runs deferred side loads and a third transform-resync path (`conveyor-entity-motion/index.ts:12-68`) | Temporal ordering is encoded in mutable helper state rather than explicit data flow |
| Sprite extraction/cache | Queueing uses a process-wide manager singleton with nine replaceable inputs, plus a per-world cache with cohorts, periodic revalidation, culling signatures, adaptive pruning, versions, and dirty masks (`queue-sprites/manager.ts:21-72`; `queue-sprites/cache.ts:8-31`, `79-145`) | Cache metadata anticipates consumers that do not exist |
| Render queue | Every command is stored in a bucket and may also be copied into a flattened ordered view; the renderer uses only buckets (`render-queue.ts:77-97`, `153-180`; `render-commands.ts:58-73`) | The queue exposes two representations and legacy APIs |
| World/context routing | Scene manager, scene context, spatial manager, a high-priority runtime system, and the client provider all participate in choosing active/visible worlds (`scene-manager.ts:22-30`, `82-99`; `manager.ts:105-121`, `183-203`; `runtime.system.factory.ts:11-23`; `world-provider.ts:7-23`) | Focus, simulation, userland world access, and render visibility have separate authorities |

## Findings

### F1 — Conveyor state has three duplicated facts and therefore requires repair code

**Confidence: high. Classification: strengthen invariant, then delete.**

`ConveyorBeltComponent.variant` already identifies a flow. A precomputed descriptor maps every supported variant to
that flow (`src/app/client/src/entities/transport-belt/core/variant-descriptor.ts:29-46`). Nevertheless each component
also stores mutable `tailDirection` and `headDirection`, and `syncConveyorBeltDirectionsFromVariant` rewrites both
from `variant` (`src/app/client/src/components/conveyor-belt.ts:22-29`, `67-77`).

The synchronization obligation is real, not theoretical:

- construction initializes directions and then repairs them from the variant
  (`src/app/client/src/components/conveyor-belt.ts:79-94`);
- explicit variant updates write all three fields
  (`src/app/client/src/entities/transport-belt/index.ts:71-101`);
- connection, rotation, auto-shape, and terminal-decoration paths call the repair function before trusting the
  fields (`TransportBeltConnectionUtils.ts:42-51`, `144-153`, `234-258`;
  `TransportBeltRotationVariantManager.ts:100-114`, `214-229`;
  `TransportBeltTerminalDecorationManager.ts:38-49`);
- auto-shaping treats disagreement between the three values as a change requiring another convergence pass
  (`TransportBeltAutoShapeManager.ts:41-75`).

Leaf status is duplicated similarly. `isLeaf` is serialized state and the marker `TransportBeltLeaf` is the query
index; the component comment explicitly says they “must always remain in sync”
(`src/app/client/src/components/conveyor-belt.ts:49-65`). `syncLeafMarker` is the repair point
(`TransportBeltConnectionUtils.ts:310-329`).

Topology links are a third inconsistency: `previousEntityId` and `nextEntityId` are serialized
(`src/app/client/src/components/conveyor-belt.ts:49-54`), while persistence describes those pointers as
runtime-derived and rebuilds all belts from spatial neighbors (`TransportBeltConnectionUtils.ts:228-259`;
`src/app/client/src/systems/core/persistence/utilities.ts:26-35`).

**Smallest simplification:** make `variant` the only stored direction source and read its already-cached descriptor.
Delete mutable direction fields and the repair function. Retain `TransportBeltLeaf` as the query index, but delete
serialized `isLeaf`; loop-anchor preservation should read the marker or establish a deterministic anchor. Stop
serializing topology links if load always rebuilds them. These changes remove representations without changing
supported belt shapes, movement, or persistence outcome.

Do not delete the linked topology itself yet: current motion deliberately uses it to avoid rediscovering neighbors
per update.

### F2 — A belt structural change is not one operation; it is a distributed transaction

**Confidence: high for structure, medium for the exact split until belt mutation tests define the boundary.
Classification: merge orchestration, split pure topology, narrow API.**

`TransportBeltAutoShapeManager.refreshBeltEntityIds` repeatedly derives both flow and variant for up to four passes,
mutates direction and sprite state, reconnects every affected belt, and then synchronizes decorations
(`src/app/client/src/entities/transport-belt/placement/TransportBeltAutoShapeManager.ts:18-82`). Reconnection itself:

- detaches old reciprocal links and attaches new ones;
- modifies blocked item-transfer state;
- recalculates leaf anchors by traversing complete connected components; and
- locates nearby belts and invokes the terminal-decoration manager

(`src/app/client/src/entities/transport-belt/topology/TransportBeltConnectionUtils.ts:144-225`, `335-349`,
`351-434`, `471-492`).

This makes call ownership ambiguous. Auto-shape calls decoration synchronization after reconnecting
(`TransportBeltAutoShapeManager.ts:78-82`), but reconnect already synchronizes decorations
(`TransportBeltConnectionUtils.ts:218-225`). The connection utility therefore knows about graph invariants, item
motion blockage, grid search, ECS leaf indexing, and presentation entities.

Decoration ownership also causes broad searches: finding one or two owned terminal entities scans the complete
`TransportBeltTerminalDecoration` store (`TransportBeltTerminalDecorationManager.ts:143-176`). This is a structural
symptom of ownership being represented only by reverse lookup, independently of whether it is currently a measured
performance cost.

**Smallest simplification:** expose one structural mutation entry point for place/update/remove and have it perform
exactly one ordered commit:

```text
derive stable variants → update reciprocal topology/anchor index → update transfer boundary state
→ synchronize affected presentation once
```

Keep graph mutation and anchor maintenance in a topology-focused module; move decoration calls out of it and into
that one orchestrator. Narrow `reconnectBelt` and low-level decoration synchronization to internal APIs. This is a
merge of orchestration and a split of unrelated graph/presentation behavior, not a new general transaction
framework.

Whether the four-pass convergence can become a single pass should be **deferred until measured and proven by
placement tests**. Neighbor variants are mutually dependent, so deleting the passes from inspection alone would be
speculation.

### F3 — Conveyor motion encodes ordering through reusable mutable helpers

**Confidence: high for comprehension cost; medium for the proposed merge because chain-order semantics need tests.
Classification: inline, merge, strengthen invariant, defer until measured.**

The system holds four module-level mutable objects: an iterator, a motion utility, a deferred-transfer array, and a
resync set (`src/app/client/src/systems/world/conveyor-entity-motion/index.ts:12-15`). For every leaf it configures
the iterator and then configures the motion object with the iterator's “initial next” result
(`conveyor-entity-motion/index.ts:25-33`). The same iterator is reset and consumed twice—first to advance items and
then to write item transforms—before side loads are resolved and affected belts are synchronized again
(`conveyor-entity-motion/index.ts:34-67`).

The helper APIs are valid only after hidden initialization:

- `ConveyorBeltChainIterator` stores nullable world, leaf, and cursor state; `iterate()` mutates the cursor and
  returns `this` (`topology/ConveyorBeltChainIterator.ts:8-38`);
- `ConveyorEntityMotionUtils` stores nullable world plus tick and next-belt state; its public methods silently do
  nothing before `set()` (`motion/ConveyorEntityMotionUtils.ts:38-90`).

The 495-line motion utility also owns lane stepping, cross-belt transfer, side loading, parent mutation,
world-position preservation, and render-transform synchronization
(`ConveyorEntityMotionUtils.ts:92-155`, `158-306`, `316-354`, `373-495`). The difficult part is not the line count;
it is that an item move simultaneously mutates lane occupancy/progress, blockage, ECS parentage, and local/previous
transforms.

**Smallest simplification:** inline the chain cursor into the only production system and pass `world`, current belt,
next belt, and delta explicitly to motion functions. Remove the `set()` lifecycle and impossible uninitialized
states. Keep advance and transform sync as two explicit phases until profiling and tests show they can be fused.
Split parent/interpolation preservation from lane occupancy only if it remains independently testable; do not create
a generic conveyor framework.

Replacing the slot model, removing side loads, or shader-deriving item position is **deferred until measured**.
Those are performance/feature decisions, not behavior-preserving complexity reductions.

### F4 — Sprite extraction maintains speculative change metadata without a downstream consumer

**Confidence: high. Classification: delete, inline, narrow API.**

The persistent sprite cache has legitimate current behavior: it retains render records, avoids some copies for
static sprites, preserves culling state, and incrementally prunes entities no longer seen
(`src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/cache.ts:79-160`;
`manager.ts:121-175`). This report does not recommend deleting that cache before measurement.

However, `SpriteRenderRecord` also exposes `spriteVersion`, `transformVersion`, `dirtyMask`, three dirty constants,
and a dirty-flag helper (`src/engine/src/core/render-pipeline/passes/render-world/sprite-render-record.ts:4-30`,
`56-60`). Production searches found:

- versions are only incremented by the writers and reset/initialized by factories;
- the flag helper has no consumer;
- the mask is used only to decide whether the cache entry is in the static cohort
  (`queue-sprites/writers.ts:11-130`; `queue-sprites/manager.ts:177-195`;
  `src/engine/src/render/frame-allocator/engine-registry.ts:100-148`).

No renderer, GPU upload, or partial-update path consumes versions or separate sprite/transform dirty bits. This
agrees with the render-pipeline report: the entire active instance prefix is still repacked and uploaded.

The queue manager adds further indirection by being a global singleton whose `instance()` method accepts and then
replaces nine frame/world-specific dependencies (`queue-sprites/manager.ts:21-72`). The singleton avoids one small
allocation but creates temporal global state and makes valid construction depend on calling `instance()` first.

**Smallest simplification:** delete both version counters, the unused helper, and the externally meaningful dirty
bit vocabulary. Have the two copy routines return booleans and decide the cohort from `spriteChanged ||
transformChanged`. Replace the manager singleton with a frame-local function/context argument, or inline its single
`queue` call path into `queueSprites`. Preserve caching, culling, periodic validation, and pruning until their value
is measured separately.

### F5 — `RenderQueue` keeps a legacy second view and permits invalid command shapes

**Confidence: high for deletion of the flat view; medium-high for the type strengthening.
Classification: delete, narrow API, strengthen invariant.**

`RenderQueue.add` places each command into a nested scope/layer/sub-layer/kind/material bucket
(`src/engine/src/render/queue/render-queue.ts:99-114`). It also marks a second flattened view dirty. Accessing
`commands`, calling `sortByLayer`, or calling `forEachCommand` rebuilds that view by copying every bucket command
reference (`render-queue.ts:90-135`, `153-180`). Production rendering reads `queue.buckets` directly
(`src/engine/src/core/render-pipeline/passes/render-world/render/render-commands.ts:47-73`). Repository-wide
production search found no caller of the flat `commands`, `sortByLayer`, or `forEachCommand` APIs.

The command representation is also a broad nullable property bag. One type permits four `type` values while `world`,
`entityId`, and `shape` are nullable and `spriteRecordIndex` is optional
(`render-queue.ts:5-20`, `55-70`). The single pooled factory starts/reset commands as a partially initialized
`shape-entity` with null ownership (`src/engine/src/render/frame-allocator/engine-registry.ts:72-98`). Downstream code
must use type guards and resolve nullable data before dispatch (`render-commands.ts:79-121`, `137-171`).

**Smallest simplification:** delete the flattened array, dirty flag, rebuild routine, and the three unused public
APIs; make buckets the only queue view. Then define exact discriminated command variants for raw shape, sprite
entity, shader entity, and shape entity. Keep pooling, but expose typed initializers/factories that return a valid
variant rather than a mutable half-command. This narrows the public API without changing ordering, batching, or draw
behavior.

Do not replace the bucket tree with a sort until benchmarks compare material/layer distributions. Its complexity may
be justified by ordering and batching, while the duplicate view is demonstrably unnecessary.

### F6 — Active-world ownership crosses five layers

**Confidence: high for the ownership overlap; medium for exact deletion scope pending report 06.
Classification: remove unsupported feature, merge, narrow API.**

The engine already maintains a stable `UserWorld` wrapper whose internal `World` is swapped when the active world
changes (`src/engine/src/core/scene/scene-manager.ts:22-30`, `82-99`). `SceneContext` independently stores both
internal worlds and stable wrappers by ID (`scene-context.ts:10-25`, `42-67`, `80-106`). On top of that,
`SpatialContextManager` stores focus and an optional controller, ensures worlds are loaded, computes visible and
simulated context sets, and pushes focus changes back into `SceneManager`
(`src/libs/spatial-contexts/src/manager.ts:15-26`, `105-121`, `139-159`, `175-203`).

A priority-100,000 runtime system repeats this binding check every update
(`src/libs/spatial-contexts/src/runtime.system.factory.ts:5-23`). Rendering does not simply render the active world:
the client provider asks the spatial manager for visible worlds and may append a transition world inferred from a
player component in the root world (`src/app/client/src/render/world-provider.ts:7-48`).

This affects unrelated systems. Build commands carry context IDs and later resolve a commit world; persistence loops
over every scene world (`src/app/client/src/systems/core/persistence/utilities.ts:12-35`). Player transition moves
the entity hierarchy between worlds and separately updates focus
(`src/app/client/src/systems/world/house-transition/index.ts:70-81`).

**Smallest simplification independent of ECS topology:** separate the one
`activeGameplaySpace` used for rendering/input/local interaction from the
`simulationSpaces` that all tick concurrently. Remove the transition-world
render append because spaces are mutually exclusive in presentation. Then
choose either one ECS world with region membership or a minimal collection of
explicitly scheduled ECS worlds; do not preserve the current focus-driven
simulation ambiguity.

The exact migration of houses/dungeons and entity move semantics belongs to `06-world-simplification.md`; this
report deliberately does not prescribe its full sequence. Until that plan confirms the required transition visual,
do not delete the current provider piecemeal.

## Recommended future changes

Ordered by amount of complexity removed relative to behavioral risk:

| Order | Classification | Smallest future change | Expected simplification | Risk |
| ---: | --- | --- | --- | --- |
| 1 | delete / narrow API | Remove `RenderQueue`'s unused flat command view and legacy iteration APIs | One queue representation; no rebuild state | Low |
| 2 | delete / inline | Remove sprite version counters and dirty-flag vocabulary; use a local boolean; replace the singleton queue manager | Less speculative state and no temporal singleton initialization | Low–medium |
| 3 | strengthen invariant / delete | Make belt variant the only direction source; retain one leaf query representation; stop persisting runtime-derived links | Removes repair calls and inconsistent states across the belt feature | Medium |
| 4 | merge / split / narrow API | Create one belt structural-change orchestration boundary, with topology free of decoration calls | One ordered mutation path and clear graph/presentation ownership | Medium |
| 5 | inline / strengthen invariant | Replace stateful conveyor iterator/helper setup with explicit chain cursor and arguments | Ordering visible at the system call site; impossible uninitialized state removed | Medium |
| 6 | narrow API / merge | Separate active presentation space from concurrent simulation spaces, then collapse ownership according to the selected storage model | Removes cross-layer focus/visibility ambiguity without pre-deciding one or many ECS stores | High; stage separately |
| 7 | defer until measured | Slot-model redesign, fused conveyor phases, render bucket redesign, persistent GPU storage | Avoids spending complexity budget without evidence | Measurement-dependent |

Each change should land independently with existing focused tests and a full workspace typecheck. Changes 1–2 are
good cleanup candidates before architecture work because they do not depend on the one-world decision. Changes 3–5
should retain conveyor placement, loops, blocking, side-load, persistence, and interpolation tests. Change 6 should
be staged only after the world simplification report identifies the required transition behavior.

## Explicitly rejected assumptions

- **“The largest modules should be split first.”** `queue-gizmos.ts` and WebGL code are large, but much of their
  length is cohesive geometry/attribute writing. They were not ranked above duplicated ownership solely by size.
- **“All conveyor topology is over-engineered.”** Stable links and a leaf query index serve the current per-update
  traversal. Only duplicate facts and distributed mutation ownership are targeted here.
- **“The four auto-shape passes are definitely redundant.”** Neighbor variants can affect one another. Remove or
  reduce convergence only with placement tests and measured real layouts.
- **“The sprite cache should be deleted because every sprite is still visited.”** Its retained records and static
  reuse have current behavior. Only metadata with no downstream consumer is safe to delete now.
- **“A persistent GPU buffer is primarily a complexity cleanup.”** It is a performance architecture decision and
  requires the experiments in reports 01–03.
- **“The render bucket tree is unnecessary.”** The duplicate flat view is unnecessary; the ordering/batching tree
  itself needs workload evidence before replacement.
- **“Multiple worlds are just spatial regions.”** Current code moves entities between separate ECS worlds and
  renders policy-selected world sets. Collapsing this is a real behavior migration, not a rename.
- **“`World` should be split because it is 824 lines.”** It combines user facade, storage, hierarchy destruction,
  movement, iteration, serialization, and serialization recording, but several of those boundaries are hot-path
  sensitive. This report does not recommend a cosmetic split before the one-world and profiling findings settle
  which responsibilities remain.

## Unanswered questions

1. Are conveyor loops required gameplay, or only supported because the topology code happened to handle them?
   Deterministic loop anchors exist specifically for them.
2. Must terminal belt decorations remain separate ECS entities, or could they be part of the owning belt's render
   description? The answer changes the best ownership fix.
3. Is there a supported operation that changes `ConveyorBeltComponent.variant` without
   `updateTransportBeltVariant`? If yes, it must be removed before variant becomes the enforced canonical source.
4. Does periodic static-sprite revalidation catch legitimate out-of-band component mutations, or compensate for a
   missing mutation boundary? Mutation tracing would determine whether it can later be removed.
5. Are the legacy `RenderQueue.commands`, `sortByLayer`, and `forEachCommand` APIs consumed by an external package
   outside this repository? No production in-repository consumer was found.
6. Should gameplay spaces use one ECS world with coordinate islands/region transforms, or several ECS worlds under
   one concurrent scheduler?
7. If one-world storage is selected, can entity `move` be deleted? Its only production call found here is the context
   transition (`src/app/client/src/systems/world/house-transition/index.ts:78`).

## Overall confidence

**High** that the duplicated conveyor facts, unused render metadata, duplicate render-queue view, and active-world
ownership overlap are present exactly as described.

**Medium-high** that recommendations 1–5 are the smallest behavior-preserving reductions. Their implementation
boundaries should be validated against focused tests, especially looped conveyors and auto-shaping.

**Medium** on the precise world-routing deletion set. Mutually exclusive
presentation and concurrent simulation are confirmed, but one-world versus
multi-world ECS storage remains open. No performance claim in this report
should be read as measured browser evidence.
