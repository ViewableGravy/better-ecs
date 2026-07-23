# Project handoff

## Branch and completed commits

Branch: `perf/stress-profiler`

- `337bedf feat(client): add stress profiler scene`
- `a2016d2 docs: add performance investigation`
- `5382477 refactor: remove premature multiplayer infrastructure`

The branch contains the stress-profiler work, performance investigation, scalable entity identity
changes, and the removal of premature multiplayer/persistence infrastructure.

## Current direction

The immediate goal is a working, scalable single-player simulation. Multiplayer, replication, and
generic engine serialization are deliberately deferred until the game establishes concrete data and
save-format requirements.

The intended world model allows MMO-style instanced interiors: entering a house or dungeon may move
the player into an isolated world/context where the exterior is not rendered or present to that
player. Other loaded simulation worlds still need to advance concurrently.

A deterministic tick and client catch-up model is a future requirement, but it has not been
implemented in this branch.

## Completed work

### Stress profiler

`BenchmarkScene` provides selectable 10k, 100k, 500k, 1M, 2M, and 5M entity scenarios. It includes
an automated benchmark runner, fixture checks, frame sampling, heap/browser metadata, construction
timings, update counts, and deterministic checksums.

See [STRESS_PROFILER.md](STRESS_PROFILER.md).

### Entity identity

- Entity IDs are scene-scoped, monotonically increasing positive safe integers.
- Destroyed IDs are not reused.
- All worlds in a scene share one allocator.
- Component stores and joins use the complete entity ID rather than a truncated bit-packed index.
- The former lifetime ceiling of 1,048,575 entity IDs no longer blocks the multi-million scenarios.
- Serialization/hydration cursor APIs were removed; only the runtime allocator remains.

### Single-player simplification

Removed:

- the server application;
- the networking package and authoritative multiplayer client scene/systems;
- the state-sync package and IndexedDB/local-storage persistence;
- generic ECS JSON/binary serialization and diff application;
- dirty queues, component version/dirty fields, `StateComponent`, `@state`, and `mutate`;
- editor world snapshot export and reset-persisted-scene UI;
- replication-only components and persistence-only repair helpers;
- stale aliases, project references, proxy routes, scripts, dependencies, tests, and lockfiles.

Ordinary component mutations now write directly to component data.

The following similarly named mechanisms remain intentionally because they are live rendering
optimizations rather than replication state:

- retained sprite dirty entity/range tracking;
- render queue `commandsDirty`;
- world-transform change detection.

`Component.attachedEntityId` also remains because conveyor simulation uses it.

## Intentional user-visible loss

There is currently no automatic save/load and no editor world-export action.

When persistence is needed, prefer a game-owned snapshot DTO written at explicit save boundaries.
Do not restore the previous engine-wide reflection, per-field proxy, dirty-diff, or replication
abstractions unless measurements and concrete multiplayer requirements justify them.

## Validation

The completed branch passed:

- full Nx workspace lint for 8 projects;
- full Nx workspace typecheck for 8 projects and their dependent builds;
- 97 engine tests;
- 106 client tests;
- 8 spatial-contexts tests;
- 1 physics test;
- production Vite client build.

The Nx all-project test command can time out while starting Vitest fork workers under the repository's
Bun/Node environment. The suites were therefore rerun directly with Node 22 and all 212 applicable
tests passed. The reliable form is:

```bash
/home/gravy/.nvm/versions/node/v22.16.0/bin/node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts
```

Run that command from the relevant project directory. The relative path is `../../../node_modules`
from `src/app/client` and `src/libs/*`.

Vite also emits a low-priority warning that package test configurations still load
`vite-tsconfig-paths`, even though Vite 8 supports `resolve.tsconfigPaths` natively.

## Recommended next task

Keep the current sparse-set ECS and prototype a typed, reusable query cursor over it. Do not begin
with a full archetype rewrite.

Suggested sequence:

1. Replace public numbered iteration usage such as `forEach2` with the existing overloaded
   `world.forEach(...)` API.
2. Define and assert that structural mutation is forbidden during active query traversal.
3. Prototype a callback-free reusable cursor/query descriptor without allocating result arrays or
   row tuples.
4. Benchmark it in the stress scene against current `forEach2`, `query + get`, and a safe tuple
   iterator, using both dense and selective component layouts.
5. Keep it only if browser measurements show it is competitive with or faster than the callback
   implementation.

At multi-million scale, packed/procedural conveyor-item storage and persistent GPU instance data are
likely more important than changing query syntax. A visually independent item does not necessarily
need to be a full object-based ECS entity.

## Retained ECS sprite rendering continuation

The engine ECS sprite path now uses retained render buckets:

- each rendered world is scanned once when it first becomes visible;
- subsequent sprite synchronization is driven by engine-owned component lifecycle/change events;
- direct `Sprite`, visual color/opacity, hierarchy, and hover mutations publish changes without
  application-layer integration;
- transform changes are published once from the existing `WorldTransform2D` synchronization
  boundary, avoiding observable accessors in the hot `Vec2` read path;
- ECS sprites queue one retained command per layer/z-order/asset/cohort bucket rather than one
  command per entity;
- WebGL keeps dense per-bucket CPU/GPU instance storage, uses generation-independent logical
  instance IDs, swap-removes physical slots, and uploads only dirty ranges with a dense-update
  fallback;
- camera conversion and previous/current position interpolation run in the retained vertex shader,
  so camera or interpolation-alpha changes do not rebuild instance data;
- static and dynamic sprites use separate retained cohorts;
- `RendererAPI.drawSprite` and manual render commands remain immediate-mode escape hatches.

The retained store and ECS integration have focused coverage for unchanged frames, dirty ranges,
growth, swap-removal, mutation publication, bucket release, and coexistence with manual commands.
The controlled RTX 4090 comparison uses Chromium 145 at 1280×720 with identical 60-frame warmup and
240-frame sample settings. At 100k sprites, retained rendering reduced average frame time from
123.19 ms to 89.65 ms (27.2%) and p95 from 133.33 ms to 100.00 ms. At 500k, both paths exceeded the
sampling deadline, but retained rendering captured 90 frames versus 73 and reduced measured average
frame time from 823.71 ms to 664.42 ms (19.3%). Reports:
`benchmark-results/stress-2026-07-23T09-41-05.117Z.json` (retained) and
`benchmark-results/stress-2026-07-23T09-44-08.775Z.json` (immediate baseline).

## Query cursor continuation

The cursor task is implemented in the current worktree and passed its browser retention gate:

- public userland calls use overloaded `world.forEach(...)`; numbered methods remain internal fast
  paths only;
- active callback and cursor traversals reject create, destroy, add/replace, remove, move, allocator
  replacement, and clear operations while allowing component-data mutation and nested read-only
  traversal;
- `world.createQueryCursor(A, B)` creates a reusable two-component sparse-set descriptor whose
  `for...of` traversal reuses its row and iterator-result objects;
- engine tests cover cursor reuse, selective joins, structural mutation, nesting, early exit,
  re-entry, and callback-error cleanup;
- the stress profiler compares `forEach`, cursor, `query + get`, and tuple iteration for dense and
  10%-selective layouts, with equivalent-work checksums and nanoseconds-per-match metrics.

The 10k production Chromium smoke report
`benchmark-results/stress-2026-07-23T07-11-06.519Z.json` passed all checks with exact strategy
checksum agreement:

| Layout | `forEach` | Cursor | Cursor difference |
| --- | ---: | ---: | ---: |
| Dense, 10k matches | 26.80 ns/match | 22.37 ns/match | 16.6% faster |
| Selective, 1k matches | 34.64 ns/match | 30.86 ns/match | 10.9% faster |

The cursor is therefore retained. `query + get` measured 62.06 ns/match in both layouts, while the
tuple iterator measured 49.42 ns/match dense and 65.36 ns/match selective.

## Reference material

- [Docs index](README.md)
- [Rendering 1M entity audit](RENDERING_1M_ENTITY_AUDIT.md)
- [Rendering performance roadmap](RENDERING_50K_120FPS_ROADMAP.md)
- [Performance research](performance-research/)
- [Deferred architecture research](architecture/)
