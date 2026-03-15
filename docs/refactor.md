Plan: Config-Driven Placement Architecture
DRAFT: Replace the current low-level createPlacementDefinition(...) shape with a higher-level placement registry built around four explicit concerns: placement intent, occupancy/rule evaluation, preview adapters, and commit/spawn lifecycles. The research shows the current system is split across createPlacementDefinition.ts, index.ts, queries.ts, and bespoke item files like transport-belt.ts. The main design goal should be runtime-first, but shaped so it can later map onto the shared placement domain already described in 12-ROADMAP-ENGINE-GAME-PLACEMENT-AND-WORLD-IO.md. Based on your answers, the plan should assume: preview-only ghosts are the target if belt-level behavior can be preserved, occupancy is both grid- and physics-driven, replacement uses explicit compatibility groups, multi-tile placement validates all occupied cells, fast-replace/upgrader extensibility matters, and preview-world vs commit-world should become first-class.

Progress status (2026-03-14)

- [x] Define a new top-level `BuildItemSpec` contract and registry-backed build-item definitions.
- [x] Migrate `land-claim`, `box`, and `transport-belt` to the new spec shape.
- [x] Normalize placement commit behavior behind shared lifecycle helpers (`createPlacementSpawner(...)` plus item-local commit hooks).
- [x] Make resolved placement intent plus preview/commit world routing explicit in the runtime flow.
- [x] Split preview adapters from the runtime placement contract while keeping the current ghost path behind an adapter boundary.
- [x] Cover the new placement flow with tests for land-claim territory checks, conveyor replacement, and explicit preview-vs-commit world behavior.
- [x] Replace the remaining ad hoc occupancy/buildability logic with a staged rule pipeline that returns evaluation details instead of only a boolean.
- [x] Rework drag/planner behavior around shared batched placement intents for the current line-placement flow.
- [x] Detach the new spec/registry runtime from the legacy `createPlacementDefinition(...)` module.
- [x] Remove the remaining low-level legacy placement factory/helpers once the staged pipeline replaces their last responsibilities.
- [x] Replace transitional gameplay-entity ghost spawning with lightweight preview-only preview entities for the current build items.

Completion notes (2026-03-14)

- Placement shared types now live in standalone runtime modules and no longer depend on `createPlacementDefinition.ts`.
- Placement rule evaluation now returns staged results (`cells`, `occupants`, `replacementTargets`, buildability/occupancy verdicts) and is reused by the item spec/runtime path.
- The placement registry no longer duplicates a hardcoded item-definition map; resolution is sourced directly from the build-item registry.
- Drag placement now resolves batched candidate paths and the runtime resolves/commits those paths through the same placement-selection pipeline.
- Ghost preview presets for `box`, `land-claim`, and `transport-belt` now spawn lightweight preview-only entities instead of spawning real gameplay entities and stripping them back into ghosts.
- The legacy `createPlacementDefinition.ts` path has been removed.
- Verification is complete through targeted Nx checks plus browser validation in the E2E scene.

Current implementation snapshot (2026-03-14)

- Item definitions now live in dedicated spec files (`box.ts`, `land-claim.ts`, `transport-belt.ts`) and are assembled through `createBuildItemSpec(...)`.
- Runtime placement resolution now produces a single resolved object containing explicit `intent`, `preview`, and `commit` sections, with preview and commit worlds kept separate.
- `resolvePlacementWorld(...)` already models `inputWorld`, `focusedWorld`, `previewWorld`, `commitWorld`, and context ids, so the runtime/world-routing part of the plan is effectively in place.
- Transport belts already prove the compatibility-group replacement path, specialized payload resolution, centered spawn offsets, and post-spawn neighbor refresh hooks.
- Preview concerns are now behind `PlacementPreviewAdapter`, but the default adapter is still ghost-backed via `GhostPreviewManager.sync(...)`.
- Drag placement now resolves full unplaced axis paths between the recorded anchor and hovered tile, so belt dragging no longer depends on hitting every intermediate cell manually.
- The main remaining legacy concentration is `createPlacementDefinition.ts`, which still owns buildability defaults, occupancy querying, compatibility checks, and replacement evaluation for the new spec system.
- `build-items.ts` and `placement/registry.ts` both register the same item set, so registration is cleaner than the old switch-based flow but not yet fully collapsed into a single source of truth.

Next session notes (2026-03-14)

- The planned refactor is complete for the current build-item set (`box`, `land-claim`, `transport-belt`).
- Future work should be feature expansion rather than continuation of the old placement-factory migration.

Steps

Document the current placement responsibility split so the refactor has a clear before/after boundary.

Capture that Placement.resolveSelection(...) in index.ts currently does three jobs: item dispatch, payload resolution, and preview/spawn binding.
Capture that createPlacementDefinition(...) in createPlacementDefinition.ts only defaults canPlace, and even that default is coupled to LandClaimQuery.isWithinBuildableArea(...).
Capture that index.ts already implies separate preview and commit concerns because it resolves placement against placementWorld but syncs the ghost into focusedWorld.
Define the new top-level contract as a registry of item specs rather than a factory returning { resolvePayload, canPlace, spawn, ghost }.

Replace hardcoded item switching in index.ts and the fixed BuildItemType union in const.ts with a registration layer.
The new unit should be a BuildItemSpec-style object whose config is declarative by default and only uses callbacks for truly item-specific logic.
The registry should resolve a selected item id into:
placement footprint metadata
occupancy policy
orientation resolver
preview adapter
commit lifecycle
remove lifecycle
drag-placement behavior
This is the main shift that makes new TransportBeltBuildStrategy(...) unnecessary; the strategy becomes data + targeted hooks.
This is mostly in place now, but the final cleanup should eliminate the duplicated registration maps between build item definitions and placement resolution.
Split “placement” into explicit phases, matching common factory-building patterns.

Introduce a runtime flow such as:
resolve intent
resolve preview context
compute footprint/orientation
gather occupancy
evaluate rules
produce preview model
commit via placement lifecycle
This phase split should be reflected in the plan around index.ts and the current per-item files under placement.
The important design constraint is that preview and commit share the same resolved intent/result object so preview cannot silently diverge from real placement.
Replace current ad hoc canPlace logic with a declarative occupancy/rule pipeline.

Build the default rule system around both grid and physics, not one or the other.
Default pipeline should:
resolve all occupied cells from footprint
require all cells to be buildable
gather grid occupants per cell
gather physics-layer occupants for collision-sensitive classes
classify occupants into compatibility groups
apply a declared strategy: block, replace-compatible, or custom predicate
The occupancy portion should absorb logic currently split between queryFirstPlacementOverlap(...), queryPlacementOccupantsByGrid(...), and replaceTransportBeltAt(...) in queries.ts.
Do not keep LandClaimQuery as a special-case inside generic defaults; instead treat buildability as one validator in the pipeline, with current land-claim exceptions represented declaratively.
Use compatibility groups as the baseline for same-kind replacement and future fast-replace/upgrader flows.
Current status: dual-source occupancy and compatibility-group replacement exist, but they are still fused into `createPlacementDefinition.ts` and return only a boolean verdict. The next pass should return staged evaluation data so preview, planner, and diagnostics can all consume the same rule results.
Promote GridFootprint from metadata into a real placement primitive.

The plan should explicitly reuse grid-footprint.ts as the basis for footprint-aware placement.
Footprint evaluation should support:
1x1 items now
rotated footprints later
multi-tile validation across all cells
future upgrade/replace compatibility at the footprint level
Physics should remain part of validation for layer filtering, but the occupancy anchor should become cell-aware rather than “first overlap collider wins”.
This is the cleanest path for Factorio-like requirements such as splitters, assemblers, underground endpoints, and footprint-wide buildability.
Normalize spawner responsibilities into a commit lifecycle instead of raw spawn(...).

Create a unified placement commit contract so simple items can remain fully declarative while complex items still have lifecycle hooks.
Default commit lifecycle should cover:
remove/replace targets
spawn primary entity/entities
attach standard placement metadata
apply render visibility
run post-place neighbor refresh
This should remove the current inconsistency where spawnLandClaim(...) and spawnBox(...) include placement metadata directly, while spawnTransportBelt(...) in index.ts needs extra work after spawn from transport-belt.ts.
Belts should keep a specialized post-commit phase for topology and visual refresh via TransportBeltConnectionUtils and TransportBeltAutoShapeManager, but those should plug into a generic lifecycle instead of living in the placement definition body.
Separate preview adapters from real entity spawning.

Treat the current ghost model as transitional, not the target architecture.
Research shows GhostPreviewManager.ts, utils.ts, and component.ts rely on spawning real gameplay entities and then mutating them into ghosts.
The redesign should define a preview adapter contract that can:
render a simple visual clone for trivial items like land claims
preserve dynamic orientation/variant updates for belts
support invalid-state feedback
support multi-preview/planner flows later
If a full preview-only implementation is too large for the first pass, allow an intermediate hybrid adapter boundary, but keep the API preview-oriented so the runtime no longer depends on “spawn real entity then ghostify it”.
Belt preview must preserve current rotation/connection-facing behavior from ghost.ts and TransportBeltPlacementRotationManager.ts.
Use land claims as the baseline spec and belts as the proof case.

First define the target abstraction against the simplest case in land-claim.ts:
no rotation
simple footprint
same look for preview and placed entity
standard block behavior
Then prove the abstraction against transport-belt.ts, which requires:
orientation resolution
conveyor-compatible replacement
centered placement offsets
post-placement auto-shaping
topology-aware preview parity
If belts still need too many escape hatches, revise the abstraction before broad rollout. Belt support is the real test that the system scales.
Fold drag placement and planner extensibility into the design now, not later.

Current drag logic in drag-placement.ts is belt-only, axis-locked, and candidate-by-candidate.
The new plan should define drag/planner behavior as an optional capability on the item spec:
single placement
line placement
future rectangular/blueprint placement
The result of drag resolution should be a batch of placement intents evaluated through the same validator pipeline and preview adapters.
This keeps the architecture open to fast replace, planners, blueprints, and deferred commit workflows.
Current status: item capabilities already expose `dragPlacementMode`, but the runtime still resolves drag one tile at a time. The next implementation step should move from `GridCoordinates[]` candidates toward a richer batched intent/result object.
Make preview-world and commit-world explicit in the placement context.

The plan should replace today’s implicit world routing with a context shape that distinguishes:
input world / focused world
preview world
commit world
spatial context id
This should be designed around index.ts and placement-target.ts.
This matters for indoor/outdoor placement, editor/runtime convergence, and future preview batching.
Define the migration path so the refactor stays tractable.

Phase 1: introduce the new registry/contracts alongside existing PlacementDefinition.
Phase 2: migrate land claim to the new spec.
Phase 3: migrate box to validate the default path.
Phase 4: migrate transport belts and extract belt-specific lifecycle hooks.
Phase 5: extract rule evaluation and shared placement types out of the legacy factory so the new runtime can stand alone.
Phase 6: collapse duplicated registries and remove the legacy factory/helpers.
Phase 7: revisit ghosts to complete preview-only rendering if the first belt migration used a hybrid adapter.
This path minimizes regressions while still converging on a cleaner end state.
Capture explicit edge cases in the handoff document so the implementing agent treats them as design constraints, not optional extras.

Same-tile same-group replacement without accidental cross-cell replacement.
Multi-tile validation across all occupied cells.
Layer filtering that can ignore background while still honoring blockers.
Neighbor-sensitive previews for belts without regressions.
Rotation that affects logical insert/output points even when visual rotation is not 1:1.
Remove hooks for entities with topology or child entities.
Preview parity when preview world differs from commit world.
Fast replace and upgrade-path compatibility groups.
Future underground belts, splitters, planners, blueprints, reserved tiles, soft blockers, and ghost-only occupancy.
Drag placement gap filling and repeated-cell suppression.
Verification

Review the architecture against the current runtime in index.ts and confirm every current responsibility has a destination in the new model.
Validate that the proposed abstraction can express:
land claim behavior from land-claim.ts
current belt behavior from transport-belt.ts
current belt drag flow from drag-placement.ts
Require the implementing agent to write the first migration against land claims before touching belts, then prove no belt regressions before removing old infrastructure.
After implementation, verification should include targeted typecheck/lint/tests for the client and physics flows, plus manual checks for:
simple place/block
conveyor replace-on-same-cell
ghost invalid-state visuals
indoor/outdoor preview routing
drag placement
deletion and post-delete belt refresh
Decisions

Runtime-first redesign, but aligned with the shared placement roadmap in 12-ROADMAP-ENGINE-GAME-PLACEMENT-AND-WORLD-IO.md.
Occupancy should be both grid- and physics-driven.
Default replacement should use explicit compatibility groups.
Multi-tile entities should validate all occupied cells.
Preview-only ghosts are the target direction, with a temporary hybrid allowed only if needed to preserve current belt behavior.
Preview world and commit world should be explicit in the design.
Belt functionality is the non-negotiable proof case; no regression is acceptable.
If useful, I can refine this into a tighter handoff version organized as “current architecture / target contracts / migration phases / risk register” for the implementing agent.