# World and Region Architecture Investigation

## Scope

This report originally investigated the non-networking runtime under the
brief's proposed one-world direction. The later product clarification defines
behavior without deciding storage:

> Exactly one gameplay space is presented and locally interactive for a player,
> while every relevant gameplay space continues simulating concurrently.

Houses and dungeons are instanced in the MMO sense: entering one teleports the
player into a mutually exclusive gameplay space, so the rest of the world is
not presented or locally interactive there. This is unrelated to WebGL
instanced rendering.

One ECS world with distant coordinate islands or region transforms remains the
smallest consolidation candidate. Multiple ECS worlds under an explicit
concurrent scheduler are also compatible with the product behavior. All
one-world deletions below are therefore conditional benefits, not a
product-confirmed migration.

It covers world registries, active-world switching, identifiers, lifecycle, entity movement, system and resource
routing, rendering, persistence, editor tooling, and the distinction between an ECS world and a spatial
region/chunk inside that world.

This is a read-only architecture pass. No production code, tests, benchmarks, or runtime behavior were changed.
Sequential scene replacement is discussed separately from simultaneous worlds: changing from one scene to another
does not inherently require more than one live ECS world.

The user confirmed after the source investigation that simultaneous
presentation is unnecessary, but relevant off-screen spaces must continue
simulating concurrently. Product behavior does not determine whether those
spaces share an ECS world.

Networking was excluded. The client networking scene is mentioned only where its registration establishes that the
application currently has multiple scene definitions; its implementation was not inspected.

## Method

1. Traced ownership from `EngineClass` through `SceneManager`, `SceneContext`, `UserWorld`, and `World`.
2. Followed active-world changes through the spatial-context runtime system and ordinary system execution.
3. Followed visible-world selection through the render pipeline, world-scoped passes, commands, and render caches.
4. Traced per-world resources through physics, sprite-record caching, editor tooling, and UI hierarchy inspection.
5. Traced world identity into component attachment, dirty commands, snapshots, scene-state reconciliation, and
   entity moves.
6. Traced the current overworld, house, and dungeon context setup and transition paths to determine which behavior
   is genuinely spatial and which behavior exists only because a context is represented as a separate ECS world.
7. Searched for chunk, partition, or spatial-index implementations. None were found outside context-entry bounds;
   the current `ContextEntryRegion` is a gameplay trigger, not a scale-oriented chunk index.
8. Consulted reports 02, 03, and 04 as secondary context, then independently verified every world-specific claim
   against current source.

## Current architecture

```text
EngineClass
└─ SceneManager
   ├─ registered SceneDefinition map
   ├─ active SceneContext
   │  ├─ Map<worldId, internal World>
   │  └─ Map<worldId, stable UserWorld wrapper>
   ├─ active world id
   ├─ active internal World
   └─ a second stable UserWorld wrapper whose target is switched

SpatialContextManager (stored in WeakMap<SceneContext, manager>)
├─ Map<contextId, ContextDefinition>
├─ focused context id
├─ context parent stack and visibility/simulation policy
└─ maps each context id to a SceneContext world

Update
└─ systems execute once against SceneManager's active UserWorld wrapper

Render
└─ WorldProvider returns one or more SceneContext UserWorld wrappers
   └─ world-scoped passes execute once per visible wrapper
```

This is not merely “several regions.” Each context has an independent ECS store, camera, physics cache key,
render-cache key, serialization namespace, and lifecycle entry.

## Evidence and findings

### F1 — A scene owns two world registries plus a separately switched active-world view

**Confidence: high. Complexity impact: very high. Runtime impact: low by itself.**

`SceneContext` owns both `Map<string, World>` and `Map<string, UserWorld>` and exposes lookup, registration,
replacement, loading, unloading, iteration, and default-world APIs
(`src/engine/src/core/scene/scene-context.ts:13-24`, `:42-72`, `:75-126`).

`SceneManager` separately owns:

- `#activeWorld`;
- `#activeWorldId`; and
- a stable `#userWorld` wrapper whose internal pointer changes

(`src/engine/src/core/scene/scene-manager.ts:22-30`). `setActiveWorld()` resolves the id from `SceneContext`, updates
all three values, and swaps the wrapper target (`scene-manager.ts:82-99`).

There are therefore two wrappers for an active internal world:

1. the wrapper stored by `SceneContext`; and
2. the wrapper exposed by `SceneManager.world` / `EngineClass.world`.

The repository already documents a defect caused by treating those wrappers as identical: portal activation
previously failed because manager and active-world wrappers differed
(`src/app/client/src/scenes/world/README.md:137-141`). The portal system still carries a warning not to compare
wrapper identity for exactly this reason
(`src/libs/spatial-contexts/src/portal/portal.system.factory.ts:21-23`).

With one world, the two registries, active id, active internal pointer, pointer-swapping wrapper, and identity rule
all collapse to one stable direct reference.

### F2 — “Spatial contexts” are independent worlds, not spatial partitions

**Confidence: high.**

`SpatialContextManager.ensureWorldLoaded()` creates a new `World` through
`SceneContext.loadAdditionalWorld()` for every non-root context
(`src/libs/spatial-contexts/src/manager.ts:139-159`;
`src/engine/src/core/scene/scene-context.ts:95-107`). The main scene eagerly loads house and dungeon worlds and
then focuses the overworld (`src/app/client/src/scenes/world/index.ts:93-96`).

The current context policies choose whole context IDs for visibility and simulation. A `stack` policy copies or
reverses the entire parent stack; `focused-only` selects its first entry
(`src/libs/spatial-contexts/src/derive.ts:11-23`). There is no entity-level spatial index, chunk store, quadtree,
cell visibility set, or region-filtered ECS traversal.

`ContextEntryRegion` is different and useful: it stores a target id and rectangle used for player/point containment
(`src/libs/spatial-contexts/src/components/context-entry-region.ts:5-20`;
`src/libs/spatial-contexts/src/utilities.ts:33-74`). It is an entry trigger or semantic boundary, not a storage
partition.

**Conclusion:** the current “context” abstraction conflates two independent concerns:

- gameplay space selection (overworld, house, dungeon); and
- ownership by an independent ECS world.

Only the first concern is evidenced as required by current gameplay.

### F3 — Simulation policy is exposed but not used to route system execution

**Confidence: high. Correctness/expectation impact: high.**

The manager exposes `getSimulatedContextIds()` and `getSimulatedWorlds()`
(`src/libs/spatial-contexts/src/manager.ts:190-203`), but there are no production consumers of either method.

The spatial runtime system instead switches `engine.scene.activeWorldId` to the focused context
(`src/libs/spatial-contexts/src/runtime.system.factory.ts:6-22`). `EngineClass.runUpdateSystems()` executes engine
systems and active-scene systems exactly once under one scene context
(`src/engine/src/core/engine/index.ts:280-301`). `fromContext(World)` returns `engine.world`, which is the separately
switched wrapper (`src/engine/src/context/index.ts:90-99`).

Consequences:

- `simulation: "stack"` is an unsupported future-facing API, not implemented multi-world simulation.
- all ordinary systems implicitly operate only on the focused world;
- built-in `worldTransform2DSystem` is a scene system and therefore also only syncs the focused world
  (`src/engine/src/core/engine/systems/index.ts:11-17`, `:49-56`);
- non-focused worlds can be rendered without their derived transforms being updated by the ordinary system path.

The current focus-switched update path does not meet the confirmed behavior. A
one-world implementation would update every relevant region/entity through the
single system pass. A multi-world implementation would need an explicit
deterministic scheduler over `simulationSpaces`. In either case,
`activeGameplaySpace` controls presentation/input/local interaction only and
must not control whether a space simulates.

### F4 — Render routing is multi-world all the way through the pipeline

**Confidence: high. Complexity impact: high. Performance impact: measurable but not quantified here.**

The client `ActiveWorldProvider` resolves the context manager, materializes its visible worlds, optionally discovers
another transition world by querying the root player, and returns the resulting list every frame
(`src/app/client/src/render/world-provider.ts:7-23`, `:26-48`).

The generic render pipeline stores:

- a `WorldProvider`;
- `visibleWorlds`;
- a mutable current `world`

(`src/engine/src/core/render-pipeline/context.ts:15-23`). Each render resolves the visible list, groups consecutive
world-scoped passes, mutates `passContext.world`, and runs the group once per world
(`src/engine/src/core/render-pipeline/create.ts:168-210`).

This requirement propagates further:

- `WorldProvider` is a public render-pipeline interface (`core/render-pipeline/types.ts:3-7`);
- context selectors expose provider, current world, and visible worlds
  (`src/engine/src/context/index.ts:126-139`);
- camera control is a world-scoped pass (`core/render-pipeline/passes/camera-control.ts:5-13`);
- render commands carry `world: UserWorld | null` (`src/engine/src/render/queue/render-queue.ts:55-70`);
- sprite commands write the world on every visible command
  (`core/render-pipeline/passes/render-world/queue/queue-sprites/utility.ts:7-29`);
- render dispatch reads the command world to resolve transforms
  (`core/render-pipeline/passes/render-world/render/render-commands.ts:90-118`, `:153-172`);
- sprite-record state is a `WeakMap<UserWorld, ...>`
  (`core/render-pipeline/passes/render-world/queue/queue-sprites/cache.ts:36-40`, `:147-160`);
- `DrawGridPass` compares focused-world identity with the current render world
  (`src/app/client/src/render/passes/DrawGridPass.ts:6-17`).

`RenderWorldPass` queues, draws, and clears once per world (`core/render-pipeline/passes/render-world/index.ts:12-23`).
Thus the world list is not providing one combined spatially culled traversal; it is duplicating the orchestration
path around independent whole-world traversals.

With one world, `WorldProvider`, `visibleWorlds`, mutable render-world context, world-scope interleaving, command
world fields, per-world cache nesting, transition-world lookup, and focus/world equality guards all disappear.
The render pipeline retains a direct world reference and runs its passes once.

### F5 — Resource ownership follows wrapper identity and can duplicate one logical world's state

**Confidence: high for mechanics; medium-high for current duplication.**

`PhysicsWorldManager` stores physics resources in `WeakMap<UserWorld, PhysicsWorldState>` and builds every wrapper
passed to `beginFrame()` (`src/app/client/src/scenes/world/physics/physics-world-manager.ts:15-28`, `:38-59`).
The sync system passes every `SceneContext.worlds` wrapper
(`src/app/client/src/systems/core/physics-world-sync/index.ts:5-9`).

Ordinary systems obtain the focused world through the different `SceneManager` wrapper and pass it to
`PhysicsWorldManager.requireWorld()` (for example
`src/app/client/src/systems/world/conveyor-movement/index.ts:12-18`). Because the two wrappers are distinct,
the same internal focused world can acquire a second `PhysicsWorldState`. The repository's wrapper-identity warning
in F1 confirms that wrapper inequality is real, not hypothetical.

The sprite cache is also keyed by `UserWorld` (`queue-sprites/cache.ts:36-40`). Render consistently receives
`SceneContext` wrappers in the current context scene, but the generic fallback provider returns `engine.world`
(`src/engine/src/core/render-pipeline/create.ts:55-58`). Cache ownership therefore depends on which routing mode
produced a wrapper rather than on a single world owner.

Per-world resources are also managed unevenly:

- assets belong to the engine and are already global, which is appropriate;
- physics is rebuilt for every loaded world each frame, even though ordinary simulation is focused-only;
- renderer records persist separately per wrapper;
- cameras are created separately in each context
  (`src/app/client/src/scenes/world/contexts/shared.ts:6-13`).

If selected, one stable world makes physics and render state direct singletons owned by that world/render runtime and
removes wrapper-keyed routing.

### F6 — Entity IDs are globally allocated, but ownership is locally ambiguous

**Confidence: high.**

Entity ids come from a module-global allocator and global generation map
(`src/engine/src/ecs/entity.ts:55-77`, `:112-127`). They are not namespaced by world. Each `World` separately stores
which ids it owns (`src/engine/src/ecs/world.ts:266-268`).

This produces an awkward split:

- an `EntityId` is globally unique/alive;
- component, hierarchy, editor, and gameplay access still need the correct world object;
- `Parent` and other entity references carry no world identity;
- cross-world lookup either scans worlds or carries `(worldId, entityId)` separately.

Examples:

- the editor scans all worlds to locate or clear gizmos
  (`src/engine/src/core/engine-editor/gizmo-manager.ts:40-74`);
- build-mode owner resolution scans focused, root, and all scene worlds and deduplicates wrappers
  (`src/app/client/src/entities/player/actions/getLocalPlayerOwnerId.ts:21-46`);
- ghost cleanup similarly collects/deduplicates several world sources
  (`src/app/client/src/entities/ghost/GhostPreviewScopeUtils.ts:8-20`, `:30-64`);
- hierarchy UI carries `worldId` down React context so entity actions can resolve the right world
  (`src/engine/src/ui/layout/sidebar/panels/hierarchy/index.tsx:46-64`;
  `src/engine/src/ui/layout/sidebar/worldViewer/context.ts:1-5`).

Some cross-world editor logic is already fragile: `setHoveredHandle()` and `setActiveHandle()` iterate worlds but
call `require(entityId, Gizmo)` in the first iteration, so they throw rather than search when the gizmo belongs to a
later world (`gizmo-manager.ts:77-105`).

With one world, `EntityId` alone identifies ownership for runtime operations. This does **not** fix the allocator's
approximately 1.05M lifetime index ceiling identified in report 03; that is a separate scale problem.

### F7 — Entity movement exists only to transfer ownership between worlds and creates inconsistent metadata

**Confidence: high. Correctness impact: high.**

`IUserWorld` and `UserWorld` expose `move(entityId, world)` (`src/engine/src/ecs/world.ts:40-59`, `:171-177`).
`World.moveEntityTo()`:

1. discovers descendants;
2. checks the target for collisions;
3. scans all source component stores for every moved entity;
4. inserts components into target stores; and
5. deletes source membership

(`world.ts:466-520`).

The house transition uses this solely to move the player between a source context world and target context world
before changing focus (`src/app/client/src/systems/world/house-transition/index.ts:70-81`).

The move path does not call `Component.__attach()` with the target world id, so serializable components retain their
old `worldId` (`world.ts:501-519`; compare attachment at `world.ts:420-426` and component metadata at
`src/engine/src/ecs/component.ts:7-40`). It also does not emit source-destroy/target-create or component movement
commands. Subsequent dirty field changes can therefore be routed to the former world.

In a single world, transition means updating an active-region scalar and, for a teleport, a transform. `move`,
descendant transfer, target collision checks, component-store migration, and stale attachment metadata disappear.

### F8 — World identity is threaded through every persistence command and snapshot

**Confidence: high. Complexity impact: high.**

`World` carries optional `sceneId` and `worldId`, resolves a fallback id on every tracked structural mutation, and
attaches that id to components (`src/engine/src/ecs/world.ts:270-295`, `:340-342`, `:420-426`).
`Component` stores optional `worldId` in addition to entity id (`src/engine/src/ecs/component.ts:7-40`).

Every diff-command variant requires `worldId`
(`src/engine/src/serialization/diff.ts:17-52`), and command application resolves the world through
`scene.requireWorld()` (`diff.ts:91-118`). Dirty-command coalescing creates composite string keys containing world,
entity, component, and field, then parses the key to look the world up again
(`src/engine/src/core/engine-serialization.ts:168-189`, `:228-287`).

Scene snapshots store an array of `{ worldId, world }`
(`src/libs/state-sync/src/scene-state/types.ts:7-15`) and serialization iterates/sorts every scene world
(`scene-state/serialize/serialize.ts:8-23`). Applying a snapshot first loads and unloads worlds to reconcile the
registry (`scene-state/apply-to-engine.ts:27-52`).

With one world:

- `Component` needs only attached entity metadata;
- diff commands need no world id;
- pending keys become entity/component/field keys;
- command application takes the direct world;
- scene state contains one `SerializedWorld`, not a sorted worlds array;
- load/unload reconciliation disappears.

This is a schema migration, not a compatibility-shim opportunity. The workspace's no-legacy policy favors migrating
or invalidating old local snapshots rather than preserving both formats indefinitely.

### F9 — World lifecycle has several cleanup paths without one authoritative destruction contract

**Confidence: high. Correctness impact: medium-high.**

World creation/replacement can occur through scene setup, `registerWorld`, and `loadAdditionalWorld`
(`scene-manager.ts:271-289`; `scene-context.ts:75-107`). Removal can occur through `unregisterWorld`,
`unloadWorld`, `clearAllWorlds`, or scene teardown (`scene-context.ts:109-142`;
`scene-manager.ts:246-269`).

These paths do not have equivalent semantics:

- `unregisterWorld()` deletes registry entries without clearing the internal world
  (`scene-context.ts:119-126`);
- `clearAllWorlds()` calls `World.clear()`, then removes non-default registry entries
  (`scene-context.ts:128-142`);
- `World.clear()` directly clears entity and component collections without detaching components or invalidating
  entity generations (`src/engine/src/ecs/world.ts:817-823`);
- scene teardown first switches the active wrapper back to the default world, cleans systems/hooks, invokes two
  teardown APIs, clears all worlds, and nulls active scene
  (`scene-manager.ts:246-269`).

The independent world paths make it unclear which owner must dispose physics state, renderer cache entries,
component attachments, dirty tracking, and entity generations. WeakMaps eventually release wrapper-keyed resources,
but only after every wrapper/reference is unreachable; that is not an explicit lifecycle contract.

One world should have one reset/dispose path owned by the application or active scene. It should define entity
destruction, component detachment, cache reset, and serialization suspension once.

### F10 — Multiple worlds leak into gameplay APIs and create broad traversal/branching

**Confidence: high.**

The build-mode placement result carries `inputWorld`, `focusedWorld`, `previewWorld`, optional `commitWorld`, four
context IDs, and a relationship solely to decide which context world receives placement
(`src/app/client/src/systems/world/build-mode/placement-target.ts:8-19`, `:24-48`).

Build-mode presentation resolves root/focused/all worlds, scans them to discover an owner, and cleans ghosts across
them (`src/app/client/src/systems/world/build-mode-presentation/index.ts:22-48`). Persistence reconnection iterates
all worlds (`src/app/client/src/systems/core/persistence/utilities.ts:12-36`). House visuals repeatedly choose root,
focused, or parent worlds, while the focus system moves the player between them.

The main scene README explicitly describes simultaneous world rendering as a demonstration goal
(`src/app/client/src/scenes/world/README.md:3-12`). This is evidence that much of the complexity validates a generic
capability, not that the application requires independent ECS ownership for each space.

In a one-world first pass:

- placement takes the direct world and, only if needed, a semantic region id;
- ghost discovery/cleanup queries once;
- persisted belt reconnection queries once;
- player lookup is direct;
- root/focused/parent world branching becomes region-state logic.

### F11 — Editor and hierarchy UI model world selection as a first-class user concern

**Confidence: high. Complexity impact: medium.**

The hierarchy snapshot includes active-world id, world id list, and `worldsById`; it iterates and sorts all world
entries, then builds a separate tree for each (`src/engine/src/ui/layout/sidebar/panels/hierarchy/queries/hierarchyTreeQuery.ts:27-32`,
`:57-99`). The panel renders a world dropdown around each entity tree
(`src/engine/src/ui/layout/sidebar/panels/hierarchy/index.tsx:41-64`).

Entity hover, delete, camera-center, gizmo, snapshot filename, and other editor actions resolve the selected world id.
For example, snapshot filenames are based on `activeWorldId`
(`src/engine/src/core/engine-editor/index.ts:111-140`).

With one world, the hierarchy snapshot is one tree, entity actions use the direct world, `WorldIdContext` disappears,
and snapshot naming uses the scene/application name. This is meaningful cognitive simplification even if editor
polling is not a production-frame bottleneck.

## What is genuinely a region or chunk?

The following concepts should not be deleted merely because multiple ECS worlds are removed:

| Concept | Current evidence | First-pass treatment |
| --- | --- | --- |
| Entry/portal bounds | `ContextEntryRegion` rectangle drives containment and transitions | Retain as the gameplay-space transition trigger regardless of ECS storage |
| Active gameplay space | House/dungeon change camera, visibility, collision, placement, and teleport behavior | Retain one `activeRegionId` for mutually exclusive presentation/input/local interaction; it does not define the simulation set |
| Visual grouping | Current code can show overworld and house together during a transition | Do not preserve simultaneous presentation; the confirmed product behavior presents only the entered space |
| Region-relative coordinates | House and dungeon currently reuse local coordinate space because their ECS stores are isolated | Compare distant same-world coordinate islands, region transforms, and minimal separate ECS stores |
| Spatial chunks | No implementation found | Do not invent during the collapse; add later only for measured loading/culling needs without pausing required simulation |
| Spatial query/culling index | No implementation found; render traverses whole component stores | Treat as a separate scale project driven by reports 01/02/03 |

A `RegionId` is not a replacement name for `worldId`. It should be gameplay/spatial data, not a routing key threaded
through every ECS, render, persistence, and resource API.

For the smallest first pass, present and locally interact with exactly one
gameplay space while retaining simulation state and behavior for every relevant
space. Region/world membership should let rendering select the entered space
before per-entity traversal. If one-world storage is selected, do not recreate a
generic `Map<RegionId, WorldLike>` abstraction around its regions.

## Conditional one-world API collapse plan

The following deletion set applies only if coordinate islands or region
transforms make one ECS world viable. If separate ECS stores remain, their
simulation scheduler and ownership API must instead be narrowed around
`simulationSpaces`.

### APIs that disappear

| Current API/state | Future action | Reason |
| --- | --- | --- |
| `SceneContext.#worlds`, `#userWorlds` | Delete | One direct world has no registry |
| `defaultWorldId`, `getDefaultWorld()` | Delete/replace with `world` | “Default” only has meaning among alternatives |
| `getWorld`, `requireWorld`, `getInternalWorld`, `hasWorld` | Delete | No cross-world lookup |
| `worlds`, `worldEntries` | Delete | No multi-world iteration |
| `registerWorld`, `loadAdditionalWorld`, `unloadWorld`, `unregisterWorld` | Delete | Unsupported live-world lifecycle |
| `SceneManager.#activeWorldId`, `activeWorldId` | Delete | The sole world is active by invariant |
| `SceneManager.setActiveWorld()` | Delete | Region focus must not swap ECS ownership |
| `UserWorld.setWorld()` | Delete if a world is stable for app lifetime; otherwise confine to sequential scene replacement | Pointer-swapping causes identity ambiguity |
| `IUserWorld.move`, `UserWorld.move`, `World.moveEntityTo`, `moveEntityShallowTo` | Delete | Teleport/focus no longer moves component storage |
| `World.worldId`, `setWorldId`, `resolveWorldId` | Delete | One world needs no runtime routing id |
| `Component.worldId` and `__attach(..., worldId)` argument | Delete | Entity attachment is sufficient |
| `SpatialContexts` WeakMap installer | Delete | One active region manager, if any, has an explicit owner |
| `createSpatialContextsRuntimeSystem()` | Delete | No active-world pointer to synchronize |
| `getVisibleWorlds`, `getSimulatedWorlds` and ID variants | Delete | Render/update share one world; update covers all relevant entities while render may select a subset |
| `WorldProvider`, `DefaultWorldProvider`, `ActiveWorldProvider` | Delete | Render owns a direct world |
| `RenderVisibleWorlds`, `RenderWorldProvider` | Delete | No list/provider |
| `RenderCommand.world` | Delete | All entity commands target the render world's direct reference |
| `WeakMap<UserWorld, ...>` nesting in sprite/physics state | Collapse | One owner needs one state |
| world dropdown and `WorldIdContext` in hierarchy UI | Delete | Entity lookup is unambiguous |

### APIs that merge or become direct references

| Current shape | Future shape |
| --- | --- |
| `EngineClass.world -> SceneManager.world -> switched UserWorld -> World` | `EngineClass.world` or active scene runtime holds one stable `UserWorld` |
| `SceneContext` world registry | If sequential scenes remain, `SceneContext { name, world }`; otherwise remove it |
| `SpatialContextManager.focusedWorld/rootWorld/getWorld(id)` | direct `world`; retain only `activeRegionId`/region metadata if gameplay needs it |
| context `setup(world)` per independent world | region setup into the same world, or inline main-scene setup |
| focus transition `sourceWorld.move(player, target); setFocusedContextId(id)` | update `activeRegionId`; update transform for teleport; keep the player entity stable |
| `PhysicsWorldManager.beginFrame(worlds)` | `physics.sync(world)` once |
| `SpriteRenderRecordCache.WeakMap<world, state>` | one `Map<EntityId, record>` owned by renderer/world runtime |
| render pass `scope: "world"` and visible-world loop | ordinary pass executes once with the direct world |
| persistence `SerializedSceneState.worlds[]` | `SerializedSceneState.world` |
| diff command `(worldId, entityId, ...)` | `(entityId, ...)` |
| editor `create(entityId, worldId?)` | `create(entityId)` |
| build placement `input/focused/preview/commitWorld` | one `world`; optionally a separate semantic placement region |

### APIs to retain

- `World` / `UserWorld` ECS operations (`create`, `destroy`, `add`, `get`, `query`, `forEach`).
- Sequential scene definitions and setup/teardown **only if** application scene switching remains required.
- `ContextEntryRegion` behavior, after renaming away from “context world,” if entry bounds remain gameplay.
- Portal target/spawn behavior, expressed as region transition and transform update.
- Render/simulation separation, renderer command batching, physics world, and asset manager.
- Explicit scene loading overlays and HMR lifecycle where they provide current value.

## Recommended future changes

### Stage 0 — Record the confirmed boundary

The implementation boundary is now:

1. `activeGameplaySpace` contains exactly the space presented and locally
   interactive for the player.
2. `simulationSpaces` contains every relevant space, all of which continue
   ticking concurrently.
3. Entering a house/dungeon changes `activeGameplaySpace`; it does not decide
   whether the underlying storage moves the player between ECS worlds.

The main implementation decision is one ECS world with coordinate
islands/region transforms versus a minimal set of concurrently scheduled ECS
worlds. A smaller decision is whether Main, E2E, and other registered scenes
must switch inside one production runtime or may use separate entry points.

### Stage 1 — Choose and establish simulation-space ownership

1. Introduce the conceptual split between `activeGameplaySpace` and
   `simulationSpaces` without changing storage.
2. Prototype one-world spaces using distant coordinate islands or a region
   transform and measure query/render-selection implications.
3. If one world is viable, establish one stable `World`/`UserWorld` and apply
   the conditional API collapse above.
4. Otherwise, retain only a minimal world collection with an explicit
   deterministic scheduler that ticks every `simulationSpace`; remove
   focus-switched update authority.
5. Make teleport behavior follow the chosen storage model: transform/region
   change within one world, or explicit ownership transfer between worlds.

This stage removes the central ambiguity before touching renderer or ECS performance.

### Stage 2 — Collapse routing consumers

1. Render only `activeGameplaySpace`; remove transition-world append and
   simultaneous-visible-world policies.
2. Key physics, renderer caches, commands, and editor lookup by the selected
   minimal ownership model rather than wrapper identity.
3. Ensure systems execute across every `simulationSpace`, either through one
   world pass or an explicit world scheduler.
4. Remove generic focus/default/visible/simulated policies that have no
   remaining product behavior.

Each consumer can be verified independently after Stage 1 establishes the invariant.

### Stage 3 — Migrate persistence without legacy plumbing

1. If one world is selected, remove `worldId` from component attachment and
   diff commands and serialize one world directly.
2. If several simulation worlds remain, retain one explicit space identity
   rather than the current overlapping wrapper/context/world identities.
3. Simplify diff coalescing keys and command application around that identity.
4. Explicitly invalidate or one-time migrate existing local snapshots; do not keep dual world-array formats.
5. Add lifecycle tests proving reset/destroy detaches components, invalidates entities appropriately, and clears
   resource state.

### Stage 4 — Add only evidenced region structure

1. Keep entry bounds and portals as gameplay-space transitions.
2. Add the narrowest space membership needed to select only the entered
   gameplay space before render extraction and local interaction queries.
3. Keep every relevant space/entity in the simulation domain. Presentation
   selection and loading must not unload or pause state that must keep
   simulating.
4. Do not add chunks until a measured culling/loading/simulation experiment identifies the needed index and update
   contract.

## Expected simplification

If one-world storage is selected, the high-confidence reduction is structural,
not a promised frame-time gain:

- one world registry becomes one reference;
- two wrapper identities become one object identity;
- active world id/pointer synchronization disappears;
- system execution and its world become the same ownership path;
- render no longer routes lists of whole worlds;
- physics and renderer caches no longer key by wrapper;
- entity references no longer require a separate world lookup;
- component dirty routing no longer carries world id;
- snapshots no longer reconcile world lifecycles;
- editor/gameplay callers no longer scan or deduplicate worlds.

The single simulation domain intentionally remains broader than the current
render candidate set: non-visible relevant entities continue to update.

If multiple ECS worlds remain, the smaller but still valuable reduction is to
replace focus-driven routing with one explicit scheduler over
`simulationSpaces` and one `activeGameplaySpace` for presentation.

Any performance benefit from fewer array creations, map lookups, physics rebuilds, and world-pass loops should be
measured after the collapse. The main expected payoff is making later high-entity-count profiling and optimization
operate on one unambiguous simulation/render domain.

## Explicitly rejected assumptions

1. **Rejected: “Multiple scenes require multiple simultaneous worlds.”** Sequential scene replacement can create
   or reset one world at a time.
2. **Rejected: “Spatial contexts are chunks.”** Current contexts are independent ECS worlds selected by policy;
   no chunk or spatial index exists.
3. **Rejected: “`simulation: stack` proves multi-world simulation is required.”** Its result APIs have no production
   consumers, and systems currently run once against the focused world. The
   product does require concurrent space simulation, but that can be implemented
   with either one ECS world or an explicit multi-world scheduler.
4. **Rejected: “World batching makes multi-world rendering cheap.”** The pipeline still performs whole-world
   routing and traversal per visible world; report 02 covers the render costs in detail.
5. **Rejected: “One world removes the need for spatial partitioning.”** A 500k-visible target may need chunks or an
   index, but that is an orthogonal data-selection primitive to add from measured evidence.
6. **Rejected: “Rename context IDs to world IDs and preserve the architecture.”** That retains the routing problem.
   Region identity must be ordinary gameplay/spatial data.
7. **Rejected: “Entity IDs are already sufficient at target scale.”** Neither storage model changes the allocator's
   20-bit index/lifetime ceiling without separate work.
8. **Rejected: “All error handling around worlds is defensive noise.”** Missing persisted state and invalid portal
   targets can be legitimate failures. The simplification removes unsupported states; remaining invalid region
   targets should still fail visibly.
9. **Rejected: “Remove scenes immediately.”** Current source registers Main, E2E, and another scene. Scene-registry
   removal should depend on whether separate entry points can replace runtime switching; it is not necessary to
   simplify gameplay-space ownership.
10. **Rejected: “Preserve the current multi-world persistence shape indefinitely.”** Even if several ECS stores
    remain, persistence should use one explicit gameplay-space identity rather than the current overlapping IDs.

## Unanswered questions

1. Should gameplay spaces use separate ECS worlds, widely separated coordinates
   in one world, or a same-world region transform?
2. Are Main/E2E/demo scenes meant to be switchable in production, or can they be separate application/test entry
   points?
3. What persisted local data must survive the schema change, if any?
4. Does any external tooling depend on `worldId` in dirty commands or snapshots? Networking was intentionally not
   inspected, so that integration must be isolated or removed in its own later task.
5. Should world reset preserve entity IDs, or should it destroy/invalidate every entity? The current `clear()` does
   neither full destruction nor invalidation.
6. What is the minimal render/input/local-interaction/lifecycle space contract?
   Update filtering is excluded for entities that must continue simulating.

## Confidence summary

| Area | Confidence | Basis |
| --- | --- | --- |
| World registries and switching | High | Direct ownership and call-path trace |
| System routing | High | `getSimulatedWorlds` has no consumers; update loop traced |
| Render routing | High | Provider-to-command path traced |
| Wrapper-keyed resource duplication | Medium-high | Distinct wrappers proven; physics keys by wrapper |
| Entity move metadata inconsistency | High | Move and attachment code directly compared |
| One-world persistence simplification | High, conditional | Complete snapshot/diff world-id path traced |
| Gameplay-space replacement shape | Medium | Presentation/simulation behavior is confirmed; ECS ownership, coordinates, and lifecycle remain open |
| Performance improvement | Low until measured | This report makes no timing claim |
