# Defensive Complexity and Invariant Audit

## Scope

This report audits speculative and defensive handling in the non-networking runtime, with emphasis on code that is
executed per entity, per update, or per rendered command. It covers:

- ECS storage, query guarantees, component attachment, and world identity;
- transform hierarchy synchronization;
- render extraction, pooled render commands, and renderer lifecycle;
- conveyor topology, conveyor item ownership, and conveyor iterator lifecycle;
- scene, system, spatial-context, asset, and persistence lifecycle boundaries;
- swallowed errors and defaults that can hide invalid state.

Networking was excluded. This is a read-only investigation; no production code or temporary instrumentation was
changed.

The six action classifications used throughout are exactly those requested in the brief:

1. **Strengthen the type**
2. **Establish an invariant during initialization**
3. **Assert once at the ownership boundary**
4. **Throw immediately**
5. **Allow the application to fail naturally**
6. **Retain the handling because the failure is legitimate and recoverable**

## Method

I statically surveyed 544 non-test TypeScript/TSX files outside networking. Broad searches for optional chaining,
fallbacks, early returns, and catches were used only for triage: they found 565 explicit `return` values associated
with absence/failure (`return`, `return null`, `return undefined`, or `return false`), 367 nullish
fallback/optional-access sites, and catch handling in nine production files. Those counts are not defect counts.

I then traced the ownership and call path around each candidate before classifying it. In particular:

- storage writers were compared with the guards in storage readers and iteration loops;
- `EntityId<T>` query guarantees were compared with downstream `world.get` checks;
- render-command creation was traced through queueing, culling, dispatch, and handlers;
- `Parent`, `WorldTransform2D`, and conveyor link/slot state were followed through mutation and consumption;
- loading, persistence, and first-render states were treated as potentially operational rather than presumed
  invalid.

No timing claims are made in this report. “Hot path” means structurally per-update/per-frame, not “measured
bottleneck.” Performance significance should be confirmed by the browser and ECS investigations.

## Failure classification

The audit uses the following distinction:

| State | Treatment |
| --- | --- |
| Expected operational failure | Retain recovery or absence handling and make the result observable where useful |
| Temporary loading/first-render state | Retain explicit state handling; avoid exception-driven polling |
| Valid search miss or optional feature | Retain nullable return/guard |
| Invalid program state | Assert at the mutation/ownership boundary or throw immediately |
| Impossible state under an already-proven invariant | Remove repeated normalization; assert once or let a direct failure expose corruption |
| Unsupported future feature | Do not make every hot consumer nullable merely to preserve it |

## Evidence and findings

### F1. Sparse-set invariants are re-checked inside every ECS iteration

**Classification:** 3 — assert once at the ownership boundary  
**Confidence:** High  
**Priority:** High, because the checks are inside generic per-entity loops.

`ComponentStore` owns two dense arrays and one sparse map. Addition appends the entity and component together, while
swap-removal moves both entries together:

- `src/engine/src/ecs/storage.ts:17-35`
- `src/engine/src/ecs/storage.ts:86-117`

The store already throws if an existing sparse entry has no dense index and if swap-removal cannot find the final
entity/component (`storage.ts:20-27`, `storage.ts:94-106`). Iteration also throws when the entity mapping is missing
(`storage.ts:119-129`).

Despite that ownership invariant, all direct iteration variants silently skip aligned-array failures:

- `World.forEach1`: `src/engine/src/ecs/world.ts:617-625`
- both branches of `World.forEach2`: `world.ts:647-661`, `world.ts:670-684`
- `World.forEach3`: `world.ts:715-751`

An `undefined` entity or component at those positions is not an empty query or a concurrent deletion. JavaScript
execution is synchronous and the callback is invoked only after the values are read. It means the store's dense
arrays are corrupt. Continuing hides the corruption and can leave dependent systems partially updated.

The same pattern appears in derived scratch arrays whose bounds are controlled locally:

- stale/dirty entity arrays in `src/engine/src/systems/worldTransform2D.ts:90-97`,
  `worldTransform2D.ts:108-121`, and `worldTransform2D.ts:189-202`;
- child arrays in `worldTransform2D.ts:254-266` and `worldTransform2D.ts:276-288`.

**Future change:** preserve invariant checks where the store is mutated, then remove silent `continue` branches from
the inner loops. If TypeScript's indexed access policy still requires proof, introduce one small internal dense-pair
accessor that asserts once rather than duplicating normalization in every consumer. Do not turn dense-array
corruption into skipped simulation.

### F2. Query result types prove component presence, but consumers repeatedly treat it as optional

**Classification:** 1 — strengthen the type  
**Confidence:** High  
**Priority:** High.

The intended contract is explicit:

- query metadata is an intersection of requested component instances
  (`src/engine/src/ecs/entity.ts:21-45`);
- `EntityComponentLookupResult` returns a non-optional component when the ID carries that metadata
  (`entity.ts:32-42`);
- `UserWorld.get` exposes that conditional result (`src/engine/src/ecs/world.ts:129-132`).

Yet consumers commonly query a component and immediately guard the same component:

- transform snapshot queries `Transform2D`, `WorldTransform2D`, and `Transform3D`, then conditionally copies each:
  `src/engine/src/systems/transformSnapshot.ts:9-30`;
- camera follow queries `Camera, Transform2D`, then silently skips a missing transform:
  `src/app/client/src/systems/core/camera-follow/index.ts:12-21`;
- camera zoom queries `Camera`, then skips a missing camera:
  `src/app/client/src/systems/core/camera-zoom/index.ts:52-61`;
- engine-camera selection queries `Camera, Transform2D` but checks both again, then looks both up a second time for
  its remembered fallback: `src/engine/src/core/engine-camera/index.ts:58-94`;
- conveyor reconnection snapshots IDs from a `ConveyorBeltComponent` query and then repeatedly tolerates a missing
  belt: `src/app/client/src/entities/transport-belt/topology/TransportBeltConnectionUtils.ts:234-259`.

Some of these guards remain because a branded ID loses its metadata when stored in a broad local type or copied to
an untyped collection. That is a type-flow problem, not a runtime absence condition.

**Future change:** retain query-branded IDs through local collections and prefer `world.forEach` callbacks when both
the ID and component are consumed. Strengthen helper signatures and collections so a query-proven component remains
non-nullable. A missing queried component should not be silently normalized.

### F3. Render commands use one weak nullable record instead of a discriminated union

**Classification:** 1 — strengthen the type  
**Confidence:** High  
**Priority:** High for complexity; potential hot-path benefit is unmeasured.

Every pooled render command has:

- a command `type`;
- `world: UserWorld | null`;
- `entityId: EntityId | null`;
- `shape: ShapeRenderInput | null`;
- optional `spriteRecordIndex`.

See `src/engine/src/render/queue/render-queue.ts:55-69`. The pool deliberately resets those fields to unrelated
defaults and nulls (`src/engine/src/render/frame-allocator/engine-registry.ts:72-98`).

That weak shape forces defensive reconstruction of valid variants:

- `isShapeDrawRenderCommand` checks both tag and shape, while `isEntityRenderCommand` re-checks world/entity:
  `src/engine/src/core/render-pipeline/passes/render-world/render/culling/utils.ts:149-159`;
- the dispatcher silently ignores records that match neither reconstructed state:
  `src/engine/src/core/render-pipeline/passes/render-world/render/render-commands.ts:79-103`;
- sprite record indices are optional and out-of-range records become `null`:
  `render-commands.ts:137-150`;
- culling contains redundant assertions for `world` and `entityId` after its own type guard:
  `culling/utils.ts:233-240`, `culling/utils.ts:243-258`, and `culling/utils.ts:279-294`.

Pooling does not require a weak public type. It requires reset/write discipline internal to the allocator.

**Future change:** model `RenderCommand` as a discriminated union in which entity commands require `world` and
`entityId`, shape-draw commands require `shape`, and sprite record presence is explicit for the extraction path that
uses it. Keep any unsafe reset state private to the pool and require a complete command before `RenderQueue.add`.
This moves validity checking to one boundary and removes repeated guards from culling and dispatch.

### F4. Renderable structure is optional at every stage, so malformed entities disappear silently

**Classification:** 3 — assert once at the ownership boundary  
**Confidence:** Medium-high  
**Priority:** High for diagnostics.

The renderer needs a transform for every ECS-backed draw, but render extraction queries only the visual component:

- shapes: `src/engine/src/core/render-pipeline/passes/render-world/queue/queue-shapes.ts:13-25`;
- shader quads: `src/engine/src/core/render-pipeline/passes/render-world/queue/queue-shader-quads.ts:13-25`;
- sprites: `src/engine/src/core/render-pipeline/passes/render-world/queue/queue-sprites/index.ts:47-59`.

The sprite queue silently returns if the derived world transform is absent
(`queue-sprites/manager.ts:81-86`). Shape/shader commands are queued anyway and later disappear when transform
resolution returns false (`render/render-commands.ts:101-104`). Handlers then look up the visual component again and
return if it vanished:

- sprite: `render/handlers/sprite-entity.ts:33-38`;
- shape: `render/handlers/shape-entity.ts:31-37`;
- shader quad: `render/handlers/shader-entity.ts:33-39`.

Queue creation and handler dispatch occur synchronously within the same render pass
(`src/engine/src/core/render-pipeline/passes/render-world/index.ts:12-23`). A queued component disappearing between
those stages is therefore not a normal loading race.

The exception is the shader **asset** check at `render/handlers/shader-entity.ts:41-44`: an external asset can
legitimately still be loading or have failed. That absence belongs to F14 and should not be conflated with a missing
`ShaderQuad` component or transform.

**Future change:** define and enforce the structural contract for renderable entities when visual components are
added (or use an explicit query/archetype containing the required transform). Pass already-resolved visual data to
the handler or require it there; do not repeatedly look it up and silently discard malformed commands. If
transform-less visuals are intended, that must become an explicit render-command kind rather than an accidental
absence path.

### F5. Invalid transform hierarchies are converted into missing render data and retried every update

**Classification:** 3 — assert once at the ownership boundary  
**Confidence:** High  
**Priority:** High.

`Parent` accepts any `EntityId` without verifying that the parent exists, is in the same world, or has a transform:
`src/engine/src/components/hierarchy/parent.ts:8-16`.

Downstream hierarchy resolution treats several invalid states as a boolean miss:

- a child or ancestor without `Transform2D` returns false;
- exceeding a depth of 64 returns false;
- an unexpectedly empty local-transform stack slot returns false.

See `src/engine/src/ecs/hierarchy.ts:60-104`.

The world-transform system similarly removes derived transforms from invalid subtrees rather than exposing the
cause:

- excessive depth: `src/engine/src/systems/worldTransform2D.ts:205-217`;
- missing local or parent transform: `worldTransform2D.ts:219-247`;
- recursive removal: `worldTransform2D.ts:271-288`.

The entity remains parented, so the next update discovers and “handles” the same invalid state again. The render
path then silently skips it through F4. A valid transient case does exist when a `WorldTransform2D` cache has not yet
been created; the system already handles that by creating it at `worldTransform2D.ts:225-229`. That is distinct from
a dangling/cyclic hierarchy.

**Future change:** make the API that attaches or changes `Parent` own same-world existence, transform presence, and
cycle validation. Deserialization/move operations should validate at their boundary too. Throw with the child and
parent IDs when violated. Once those boundaries are reliable, hierarchy resolution should return failure only for a
documented optional lookup, not to normalize broken graph structure.

### F6. Conveyor variants are stored as `string`, turning invalid state into an inert belt

**Classification:** 1 — strengthen the type  
**Confidence:** High  
**Priority:** High.

The closed set already exists as `TransportBeltVariant`
(`src/app/client/src/entities/transport-belt/consts.ts:20-43`), and every valid variant has a flow
(`consts.ts:74-95`). However:

- `ConveyorBeltComponent.variant` is declared as `string`
  (`src/app/client/src/components/conveyor-belt.ts:67-68`);
- the flow/descriptor registries accept arbitrary strings (`consts.ts:74`, `consts.ts:105-107`,
  `core/variant-descriptor.ts:29`, and `variant-descriptor.ts:53-55`);
- player conveyor movement writes a zero vector and returns for an unknown descriptor
  (`src/app/client/src/entities/transport-belt/motion/ConveyorMovementUtils.ts:23-28`);
- item animation support quietly returns false
  (`src/app/client/src/entities/transport-belt/ConveyorUtils.ts:60-69`).

Other code already asserts the same descriptor/flow must exist:
`components/conveyor-belt.ts:22-28` and `motion/BeltItemRailsUtility.ts:39-42`. The mixed contracts mean the same
invalid variant can crash one path and be silently normalized by another.

**Future change:** store `TransportBeltVariant`, type lookup tables as exhaustive
`Record<TransportBeltVariant, ...>`, and validate persisted strings when materialized. For a valid typed variant,
flow and descriptor lookup should be non-nullable. Unknown persisted data is a load error, not a stationary conveyor.

### F7. Reusable conveyor workers have an invalid “unset” state checked in their hot methods

**Classification:** 2 — establish an invariant during initialization  
**Confidence:** High  
**Priority:** Medium-high.

`ConveyorBeltChainIterator` starts with nullable world, leaf, and current IDs. `setLeaf` is required before use, but
`getInitialNextEntityId` and `next` silently return an empty result when it was omitted:
`src/app/client/src/entities/transport-belt/topology/ConveyorBeltChainIterator.ts:8-55`.

`ConveyorEntityMotionUtils` has the same shape: `world` starts null, `set` is required, and both
`advanceConveyorEntity` and `syncConveyorEntityTransforms` silently no-op if setup was omitted:
`src/app/client/src/entities/transport-belt/motion/ConveyorEntityMotionUtils.ts:38-89`.

The only production call path establishes both immediately before traversal:
`src/app/client/src/systems/world/conveyor-entity-motion/index.ts:25-40`. Therefore “unset during a hot method” is
not an operational absence state; it is a caller lifecycle bug.

**Future change:** establish a per-traversal initialized object/state at `setLeaf`/`set`, or pass the required world
and IDs into a traversal method so the invalid state cannot be observed. If reuse is necessary to avoid allocation,
an internal initialized flag may assert once; hot methods should not silently finish.

### F8. Missing conveyor links and item components truncate motion while leaving stale ownership behind

**Classification:** 3 — assert once at the ownership boundary  
**Confidence:** High  
**Priority:** High.

Conveyor topology and lane slots store raw entity IDs. Consumers treat a stale ID as recoverable, but do not repair
the owning state:

- a linked belt without `ConveyorBeltComponent` ends chain iteration silently:
  `topology/ConveyorBeltChainIterator.ts:46-55`;
- topology graph traversal skips missing belts:
  `topology/TransportBeltConnectionUtils.ts:381-407`;
- `advanceConveyorEntity` and transform synchronization no-op for a missing conveyor:
  `motion/ConveyorEntityMotionUtils.ts:53-89`;
- a lane slot referencing an item without `Transform2D` is skipped without clearing the slot:
  `ConveyorEntityMotionUtils.ts:316-355`;
- missing source/target conveyors turn a previously derived side-load transfer into `false`:
  `ConveyorEntityMotionUtils.ts:126-155`;
- an attached next-conveyor component is still checked for both `null` and `undefined` owner ID on every tail transfer:
  `ConveyorEntityMotionUtils.ts:373-395`, even though attachment uses `EntityId | undefined`, not `null`
  (`src/engine/src/ecs/component.ts:7-35`).

These branches can freeze an item or truncate a chain indefinitely while preserving the stale link that caused it.
They are not ordinary “no neighboring belt” cases; those are explicitly represented by `nextEntityId === null` and
empty slots.

**Future change:** make belt destruction, item destruction, transfer, and reparenting go through ownership APIs that
atomically update links/slots/parents. Assert component attachment once when accepting a belt into topology. After
that boundary, a non-null link or occupied slot must resolve; throw with the owner/slot/link IDs if it does not.

### F9. Conveyor ownership is duplicated and relies on manual synchronization

**Classification:** 2 — establish an invariant during initialization  
**Confidence:** High that duplication exists; Medium on which representation should survive  
**Priority:** Medium-high.

`ConveyorBeltComponent` explicitly documents that `isLeaf` and `TransportBeltLeaf` “must always remain in sync,”
while `nextEntityId` also determines whether an open chain tail is a leaf:
`src/app/client/src/components/conveyor-belt.ts:49-65`.

`syncLeafMarker` updates the boolean and adds/removes the marker component
(`topology/TransportBeltConnectionUtils.ts:310-329`). Loop-anchor recovery then reads the boolean
(`TransportBeltConnectionUtils.ts:455-468`), while the motion system starts work by querying the marker component
(`systems/world/conveyor-entity-motion/index.ts:25-47`).

Item ownership is also represented by:

- an entity ID in one lane slot;
- the item's `Parent` component;
- a parallel progress array at the same slot index.

Transfers manually update all of them at `motion/ConveyorEntityMotionUtils.ts:398-408` and
`ConveyorEntityMotionUtils.ts:421-444`.

This duplication may be a deliberate query optimization, but it is currently a broad invariant maintained by
convention and defended by downstream null checks.

**Future change:** choose one topology/lane mutation boundary and initialize all representations there. Keep a
duplicate leaf marker only if profiling justifies it, but treat it as a derived index rather than independent saved
truth. Add an invariant check at topology rebuild/load, then remove consumer-side tolerance. The final choice to
delete `isLeaf`, the marker, or neither should be informed by the ECS/performance measurements.

### F10. Known scene-system lifecycle errors are silently treated as “no systems”

**Classification:** 4 — throw immediately  
**Confidence:** High  
**Priority:** Medium.

`SystemsManager.initializeSceneSystems` and `cleanupSceneSystems` return when the named scene has no registered
entry:
`src/engine/src/core/engine/systems/index.ts:73-100`.

Those methods are called by `SceneManager` with the active, already-registered scene definition:

- cleanup: `src/engine/src/core/scene/scene-manager.ts:246-265`;
- initialize: `scene-manager.ts:271-288`;
- registration occurs in the manager constructor: `scene-manager.ts:47-52`.

At those call sites, a missing entry means registration state is inconsistent. Returning allows a scene to run
without its systems and makes the error appear later as missing state.

By contrast, `getSceneUpdateSystems(null)` returning an empty list at `systems/index.ts:59-64` is valid while no
scene is active, and `getSceneSystem` returning `undefined` is a valid public lookup.

**Future change:** throw from initialize/cleanup when a known scene has no entry. Keep nullable/empty semantics only
on lookup APIs whose names and types advertise absence.

### F11. World and component lifecycle are represented by optional fields that leak into unrelated code

**Classification:** 1 — strengthen the type  
**Confidence:** Medium-high  
**Priority:** Medium.

`World` has optional `sceneId` and `worldId`, and serializing/mutation tracking resolves identity through
`worldId ?? sceneId ?? "default"`:
`src/engine/src/ecs/world.ts:266-285`. A world that was not registered correctly is therefore silently attributed to
`"default"`.

Likewise, a `Component` always exposes `attachedEntityId` and `worldId` as optional because detached components are
allowed (`src/engine/src/ecs/component.ts:7-41`). Serialization recording then combines legitimate distinctions into
silent compound guards:

- add/remove: `src/engine/src/core/engine-serialization.ts:87-123`;
- field change: `engine-serialization.ts:138-153`.

Non-serializable components are expected and should be ignored. A serializable component passed immediately after
`World.addComponent` has already been attached (`world.ts:420-426`), so missing owner/world identity there is an
invariant violation. The combined branch conceals which case occurred.

**Future change:** distinguish unregistered/detached objects from attached runtime handles at the type/API boundary.
Require world identity when a world joins a scene, and do not invent `"default"` for engine-owned tracking.
Provide a required attached-owner view or assertion for serialization hooks. Retain optional access for explicitly
detached components, but do not propagate that optionality through attached mutation paths.

### F12. Spatial contexts allow unknown definitions to become real worlds, creating downstream optional checks

**Classification:** 4 — throw immediately  
**Confidence:** High  
**Priority:** Medium under current architecture; likely deleted by the one-world simplification.

`SpatialContextManager.setFocusedContextId` calls `ensureWorldLoaded`
(`src/libs/spatial-contexts/src/manager.ts:113-121`). `ensureWorldLoaded` creates a world even when no definition is
registered; setup is merely optional (`manager.ts:139-159`). That normalizes an unknown/typo context ID into a
mostly-valid world.

Other invariant weaknesses compound this:

- `registerDefinition` inserts the definition before cycle validation, so a thrown validation leaves the invalid
  definition in the map (`manager.ts:37-45`);
- `unregisterDefinition` does not reconcile a focused or loaded world (`manager.ts:47-49`);
- house transition treats a missing focused definition, parent world, region, or region bounds by deleting
  `InsideContext` and returning (`src/app/client/src/systems/world/house-transition/index.ts:40-58`);
- transition completion returns `true` when no binding exists
  (`systems/world/house-transition/contextTransitionMutator.ts:56-71`), potentially completing a transition whose
  required visual state was never created.

These are not asset-loading misses. They are missing architectural records for an already-focused context.

**Future change:** while spatial contexts exist, validate a definition before inserting it, require a registered
definition before loading/focusing non-root contexts, and make unregister reconcile or reject active state.
Downstream transition systems should throw on an already-focused context missing its required definition/world
records. If the planned one-active-world direction removes this feature, delete these branches with it rather than
preserving fallback behavior.

### F13. Invalid runtime configuration is silently clamped or defaulted

**Classification:** 4 — throw immediately  
**Confidence:** High  
**Priority:** Medium.

Valid absence and invalid values are mixed together:

- omitted culling scale gets a default, but non-finite values also get that default, values at/below zero become
  `0.01`, and values above one become one:
  `src/engine/src/core/engine/render-culling.ts:12-43`;
- engine camera zoom at/below zero silently becomes one:
  `src/engine/src/core/engine-camera/index.ts:35-47`;
- `startEngine` uses `opts?.fps || 60` and `opts?.ups || 60`, so zero becomes the default while negative and
  non-finite rates are accepted; `Meta.setTargetRates` performs no validation:
  `src/engine/src/core/engine/index.ts:166-172` and `src/engine/src/core/engine/meta/index.ts:20-25`.

These are initialization/configuration errors, not intermittent operational failures. Silent normalization makes a
typo appear as unexpected culling or frame pacing.

**Future change:** keep defaults only for `undefined`. Validate finite positive rates and the documented culling
range once during engine construction/start, then throw a precise configuration error. A positive-finite branded
configuration type can follow if the values cross many APIs.

### F14. Asset and texture absence is legitimate, but error observability is inconsistent

**Classification:** 6 — retain the handling because the failure is legitimate and recoverable  
**Confidence:** High  
**Priority:** Retain; improve observability separately.

Image decode, fetch, timeout, and GPU upload deferral are operational:

- `AssetManager` explicitly tracks `"loading" | "error" | "ready"` and rejects timeout/load failures:
  `src/engine/src/asset/AssetManager.ts:5`, `AssetManager.ts:76-97`, `AssetManager.ts:248-294`;
- non-strict `get`/`getLoose` trigger a load and return `undefined`, catching the rejected promise:
  `AssetManager.ts:148-184`;
- texture upload budget and pending state legitimately return `null` for a later frame:
  `src/engine/src/render/textureCache/texture-cache.ts:110-194`;
- shader rendering returns while its source asset is unavailable:
  `src/engine/src/core/render-pipeline/passes/render-world/render/handlers/shader-entity.ts:41-44`.

The `.catch(() => undefined)` calls do not fully erase errors because `load` records `"error"` and logs at
`AssetManager.ts:284-287`. Nevertheless, callers cannot retrieve the underlying error, and a failed lazy texture
becomes visually indistinguishable from a still-pending one unless logs are inspected.

**Future change:** retain non-throwing render-time access and explicit loading/error states. Add an observable error
or status query if diagnostics require it; do not make every draw throw because an external asset failed. Strict
setup paths should continue to use `load`/`getStrict`.

### F15. Browser persistence failure is operational; silent corruption fallback is not sufficiently visible

**Classification:** 6 — retain the handling because the failure is legitimate and recoverable  
**Confidence:** High  
**Priority:** Retain recovery, improve reporting.

Unavailable storage, malformed JSON, schema drift, quota errors, worker failure, and corrupt stored data are expected
operational failures in a browser.

The IndexedDB input path handles this well: it logs hydration failure, clears persisted state, restores the captured
initial state, and rethrows if restoration itself fails
(`src/libs/state-sync/src/adapters/indexed-db-worker/input/IndexedDbWorkerInputAdapter.ts:13-49`).
Local-storage flush errors are emitted as backend error events rather than swallowed
(`src/libs/state-sync/src/adapters/local-storage/backend/LocalStorageBackend.ts:159-200`).

The weak case is local-storage parsing: malformed JSON or invalid schema is caught and returned as
`{state: null, hasStoredValue: true}` without the error
(`src/libs/state-sync/src/adapters/local-storage/backend/storage.ts:20-41`). `LocalStorageBackend.load` then emits
`hasStoredState: stored.state !== null`, discarding `hasStoredValue`
(`LocalStorageBackend.ts:89-99`). Corruption therefore becomes indistinguishable from first use and is silently
seeded with defaults by `LocalStorageInputAdapter`
(`src/libs/state-sync/src/adapters/local-storage/input/LocalStorageInputAdapter.ts:16-32`).

**Future change:** retain fallback-to-initial-state behavior, but carry a parse/hydration error through the backend
event and explicitly clear or quarantine the bad value. Restoration failure should remain fatal. Do not replace
this with an unconditional crash; persisted data is outside the program's control.

### F16. Some lifecycle absence handling is valid, but mixed branches should be separated

**Classification:** 6 — retain the handling because the failure is legitimate and recoverable  
**Confidence:** High  
**Priority:** Low-medium.

Legitimate examples include:

- a headless engine with no render pipeline: `RenderManager.initialize`, `warmupLoadedTextures`, and `render` must
  tolerate `null` (`src/engine/src/core/render-pipeline/manager.ts:3-34`);
- a React canvas can be temporarily unattached: `CanvasManager.getCanvas` throws, while preview-mode pointer
  handling catches that during the first render/reattach window
  (`src/engine/src/core/canvas/index.ts:25-31`,
  `src/engine/src/ui/components/previewMode/provider.tsx:28-49`);
- scene transitions correctly use `finally` to clear transition state and dispose overlays even when setup/teardown
  throws (`src/engine/src/core/scene/scene-manager.ts:169-191`);
- execution context restoration correctly covers synchronous throws and asynchronous rejection
  (`src/engine/src/core/context.ts:67-89`);
- destructive ECS operations are intentionally idempotent: destroying or removing an absent entity/component is
  a reasonable no-op (`src/engine/src/ecs/world.ts:315-328`, `world.ts:451-464`).

However, `RenderManager.warmupLoadedTextures` also silently returns when a non-null pipeline has not been initialized
(`render-pipeline/manager.ts:20-29`). That is a different state from “headless.” The engine's normal sequence
initializes then warms (`src/engine/src/core/engine/index.ts:141-151`), so an early warmup call is a lifecycle misuse.

**Future change:** retain explicit headless and temporary-canvas behavior. Separate “feature absent” from “feature
present but not initialized”; the latter should assert at the public lifecycle boundary. Prefer a nullable
`tryGetCanvas`/state query for UI polling rather than throwing and catching on pointer events.

### F17. Serialization uses exceptions for membership and defaults required scalar fields

**Classification:** 1 — strengthen the type  
**Confidence:** Medium-high  
**Priority:** Medium.

Serializable-component membership is implemented by calling a throwing lookup and swallowing its error:
`src/engine/src/serialization/serializableComponent.ts:250-260`. The registry lookup throws for an unregistered name
at `src/engine/src/serialization/state.ts:124-131`. This is normal predicate control flow, not an exceptional
condition.

Binary serialization also normalizes absent scalar state:

- absent string becomes `""` in both sizing and encoding;
- absent bigint becomes `0n`;
- other numeric conversions use `Number(value)`, allowing undefined/invalid values to reach typed writes.

See `serializableComponent.ts:47-79` and `serializableComponent.ts:86-144`. JSON serialization explicitly maps both
`undefined` and `null` to `null` (`serializableComponent.ts:272-297`). The field metadata has no “optional” marker:
`src/engine/src/serialization/state.ts:7-36`.

For declared component state, an undefined scalar generally indicates a constructor/deserialization invariant
failure. Defaulting it masks the first useful failure and changes data.

**Future change:** add a non-throwing registry membership lookup. Distinguish required and optional serialized fields
in metadata/types; throw when a required scalar is absent or not representable. Preserve null/default compatibility
only for fields explicitly declared optional or for a versioned migration path.

## Summary matrix

| ID | Area | Invalid state currently normalized | Future action | Confidence |
| --- | --- | --- | --- | --- |
| F1 | ECS dense iteration | misaligned dense arrays | 3 — assert once at ownership boundary | High |
| F2 | Query consumers | queried component treated as optional | 1 — strengthen type | High |
| F3 | Render command model | incomplete pooled command | 1 — strengthen type | High |
| F4 | Renderable entities | missing visual/transform silently skipped | 3 — assert once at ownership boundary | Medium-high |
| F5 | Hierarchy | dangling/cyclic/deep parent graph becomes missing transform | 3 — assert once at ownership boundary | High |
| F6 | Conveyor variants | unknown string becomes inert belt | 1 — strengthen type | High |
| F7 | Conveyor workers | unset iterator/mutator silently ends | 2 — establish invariant during initialization | High |
| F8 | Conveyor references | stale link/slot truncates motion | 3 — assert once at ownership boundary | High |
| F9 | Conveyor duplicate state | leaf, slot, progress, parent drift | 2 — establish invariant during initialization | High/Medium |
| F10 | Scene systems | registered scene lacks system entry | 4 — throw immediately | High |
| F11 | World/component identity | missing identity becomes `"default"`/no-op | 1 — strengthen type | Medium-high |
| F12 | Spatial contexts | unknown context creates a world | 4 — throw immediately | High |
| F13 | Runtime configuration | invalid value clamped/defaulted | 4 — throw immediately | High |
| F14 | Assets/textures | external loading failure/pending state | 6 — retain recoverable handling | High |
| F15 | Browser persistence | corrupt external data | 6 — retain recovery, expose error | High |
| F16 | Headless/first-render | absent optional feature or temporary canvas | 6 — retain; split from misuse | High |
| F17 | Serialization | exception predicate and absent scalar defaults | 1 — strengthen type | Medium-high |

Action 5 (“allow the application to fail naturally”) is deliberately not the primary recommendation for these
findings. The invalid states cross ownership boundaries and a natural `TypeError` later would be less diagnosable
than one precise boundary assertion. It remains appropriate after a boundary has proven array/command completeness:
inner-loop code need not add another fallback merely to avoid a direct failure if internal corruption somehow
occurs.

## Recommended future changes

### Stage 1: make current invalid state visible

These changes are small and independently testable:

1. Throw when a known scene has no registered system entry (F10).
2. Validate finite positive FPS/UPS and culling/zoom configuration; default only omitted values (F13).
3. Require valid non-root context definitions before focus/load, if spatial contexts remain during the first
   refactor (F12).
4. Replace conveyor invalid-variant fallback with exhaustive typed lookup and persisted-data validation (F6).
5. Report local-storage corruption while retaining recovery (F15).

### Stage 2: move assertions to ownership boundaries

1. Validate `Parent` assignment and deserialization once; stop invalidating broken hierarchies every frame (F5).
2. Centralize conveyor topology/lane mutation and validate the rebuilt topology after load (F8, F9).
3. Enforce a renderable structural contract before queueing and make complete render commands the only values the
   queue accepts (F3, F4).
4. Separate attached world/component handles from detached/unregistered state (F11).

### Stage 3: remove downstream defensive work

After boundary tests exist:

1. remove impossible dense-array checks from ECS, render queue, and transform scratch loops (F1);
2. preserve query metadata and remove component-presence checks immediately following a proving query (F2);
3. make conveyor traversal state initialized by construction/set-up and remove hot no-op checks (F7);
4. remove catch-based serialization membership and reject absent required scalar state (F17).

### Handling to retain

Do not remove:

- pending/error asset and texture states or upload-budget deferral (F14);
- explicit recovery from corrupt/unavailable browser persistence, with better observability (F15);
- headless rendering and first-render canvas absence (F16);
- nullable search/query APIs where absence is the advertised result;
- idempotent destructive ECS methods;
- `try/finally` around context, transition, allocator, and loading-overlay restoration.

## Confidence level

**Overall confidence: High** for identifying concrete redundant or state-masking branches, because the relevant
writers and readers are in the repository and their synchronous call paths can be traced directly.

**Medium confidence** applies to the final representation choice for renderables, attached components, and duplicate
conveyor leaf state. The invariant weakness is concrete, but the smallest final representation depends on the
performance measurements and on whether spatial contexts/multiple worlds are removed.

No claim is made that removing a branch alone will materially improve frame time. F1, F2, F3, and F7 are plausible
hot-loop simplifications; the browser profile must quantify their impact.

## Explicitly rejected assumptions

1. **“Every null check is unnecessary.”** Rejected. Searches, optional editor features, headless rendering, asset
   loading, culling disabled state, and persistence failure have meaningful absence semantics.
2. **“A missing asset is invalid program state.”** Rejected. Fetch, decode, timeout, upload budget, and user storage
   are operational boundaries. Strict setup may fail; render-time access should remain non-throwing.
3. **“Silent early return is always bad.”** Rejected. Empty queries, no collision overlap, no adjacent belt, no
   pending input, and idempotent destroy/remove are valid guard clauses. The problem is an early return after an
   earlier query/type/ownership boundary already proved presence.
4. **“All hierarchy resolution should throw.”** Rejected. An explicitly optional lookup may return no transform.
   A hierarchy owned by the simulation must not repeatedly normalize dangling parents or cycles.
5. **“Duplicate `isLeaf` state should definitely be deleted.”** Rejected without measurement. The marker can be a
   useful query index. The current problem is independent mutable truth without a single enforced owner.
6. **“Persistence should crash on corrupt stored data.”** Rejected. Recovery is legitimate. It must be observable,
   explicit, and must not swallow failure to restore valid initial state.
7. **“Missing render component and missing shader asset are the same.”** Rejected. The former is malformed
   synchronous command state; the latter is a legitimate asynchronous operational state.
8. **“The raw counts from the search are findings.”** Rejected. They were triage only; every reported finding was
   traced through its writer/owner and consumer.
9. **“A natural later `TypeError` is preferable to all assertions.”** Rejected at ownership boundaries. Precise
   assertions provide IDs and invariant context. Natural failure is acceptable only inside code whose inputs were
   already proven.

## Unanswered questions

1. Are entities with `Sprite`, `Shape`, or `ShaderQuad` but no `Transform2D` intentionally supported? If so, what
   coordinate source should they use? The current behavior merely hides them.
2. May a `Parent` legally reference an entity without `Transform2D`, or cross worlds? Current transform composition
   cannot make either case useful.
3. Can conveyor items be destroyed independently while occupying a slot? If yes, which API owns slot cleanup? No
   such ownership boundary is evident in the audited path.
4. Is `TransportBeltLeaf` intended as a pure derived query index, and is `isLeaf` required outside loop-anchor
   recovery? Current production reads are limited enough that one representation may be removable.
5. Should invalid persisted conveyor variants be migrated, rejected and cleared, or surfaced to the user? There is
   no schema/version policy evident for that component state.
6. Is lazy asset retry required after `"error"`? `AssetManager` and `TextureCache` currently make error effectively
   terminal for the manager lifetime.
7. Is canvas removal allowed after engine start? `CanvasManager` keeps the original ready promise after removal, so
   the supported attach/detach lifecycle should be made explicit before strengthening it.
8. Does local-storage recovery need parity with IndexedDB recovery (clear bad value, restore snapshot, error event)?
9. If one active world is adopted, should detached standalone `World` instances remain public for tests/tools, or
   can runtime worlds require identity at construction?
10. Which of the F1/F2/F3 guards appears in measured top stacks at 500k visible entities? Remove them for correctness
    and clarity only after the boundary invariants are tested; prioritize performance work by profile.
