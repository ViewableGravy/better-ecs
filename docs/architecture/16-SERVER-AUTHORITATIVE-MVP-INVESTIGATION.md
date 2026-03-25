# 16 - Server Authoritative MVP Investigation

## Goal

Implement the authoritative MVP in three phases: first split simulation from presentation inside the current client, then move authoritative gameplay into a Bun server while keeping a single client working, and only after that add multiplayer sessions and external players. This document is the implementation guide for rebuilding that path from scratch.

## 1. Split Authoritative And Local Systems First

Current status:
- Complete. The client scene now runs in explicit support / intent / command / authoritative / local-presentation bands, and the split checklist below has been completed.

Implementation: Before introducing networking, separate every mixed system into either authoritative simulation or local presentation. Authoritative systems should own gameplay mutation, collision decisions, placement commits, deletion, conveyor simulation, spawning, and any state that other clients must observe. Local systems should own input capture, camera follow, zoom, HUD, login UI, debug overlays, preview ghosts, and any render-only helpers. The current app should still behave the same after this split, but the boundaries should be explicit.

Things to consider:
- Keep render and UI code out of authoritative mutation paths.
- Make client-only systems read authoritative state instead of writing it.
- Keep preview entities and overlays out of replicated gameplay state.

### Target Band Ordering Inside A Scene

Implementation: The client should be organized into explicit execution bands so that the future network port is mostly a matter of moving the authoritative band to the server and replacing it with prediction on the client later.

```ts
systems: [
	// support
	CommandAllocatorReset,
	PhysicsWorldSync,

	// intent
	BuildModeIntent,
	LocalPlayerMovementIntent,

	// command
	BuildModeCommand,
	LocalPlayerMovementCommand,

	// authoritative
	PlayerMovementAuthority,
	SpatialContextCollisionAuthority,
	ConveyorEntityMotionAuthority,
	ConveyorMovementAuthority,
	PortalAuthority,
	ContextFocusAuthority,
	BuildModeAuthority,

	// local presentation / adapters
	CameraFollow,
	CameraZoom,
	BuildModePresentation,
	HouseVisuals,
	DebugOverlay,
	Persistence,
]
```

Band rules:
- `support` systems prepare deterministic runtime data for the current update and may run on client or server depending on the feature. They must not read local UI state.
- `intent` systems read local input and local-only UI state, then write intent state only. They do not emit gameplay mutations.
- `command` systems translate intent plus readable authoritative state into explicit typed command batches. They do not mutate gameplay state.
- `authoritative` systems are the only systems allowed to mutate gameplay state that must later live on the server.
- `local presentation / adapters` read authoritative state and local state to drive camera, ghost previews, HUD, overlays, debug tooling, and persistence adapters.

### Shared Command Library Layout

Implementation: Move gameplay command schemas out of the client app and into a shared workspace library before the networking stage. Keep folders organized by feature rather than putting all commands into a single file.

Current status:
- Shared command library initialized at `src/libs/commands`.
- Build-mode place/delete commands now import from the shared library instead of `src/app/client/src/commands/types.ts`.
- The next command families should follow the same pattern rather than adding new app-local command types.

Suggested layout:

```text
src/libs/commands/
	src/
		build-mode/
			delete.ts
			place.ts
			index.ts
		movement/
			move.ts
			index.ts
		spatial-contexts/
			portal-transition.ts
			focus-change.ts
			index.ts
		conveyor/
			index.ts
		index.ts
```

Things to consider:
- One file per logical command shape.
- Each feature folder exports its command union and helper constructors/guards if needed.
- Client intent/command systems and future server authoritative systems should both import from this shared library.
- Avoid mixing transport schemas, input adapters, and server session code into the same files.

### System Split Checklist

Implementation: Complete the split one system at a time. Each item below should preserve current gameplay while isolating the logic into the target band structure. This checklist is the handoff plan for future implementation agents.

- [x] `main:build-mode-intent`
	- Current source: `src/app/client/src/systems/world/build-mode/index.ts`
	- Goal: read build-mode input and hovered placement state, then write build intent state only.
	- Move out: command allocation and command emission.
	- Keep local: selected item, pending place/delete flags, drag session state.
	- Current status: now input-only and renamed to `main:build-mode-intent`.

- [x] `main:build-mode-command`
	- Current source: `src/app/client/src/systems/world/build-mode/commands/utilities.ts`
	- Goal: consume build intent state and emit typed build commands into a command buffer.
	- Move in: `emitBuildModeCommands(...)` and command allocator usage.
	- Constraint: no placement commits, deletions, or world mutation.
	- Current status: implemented in `src/app/client/src/systems/world/build-mode-command/index.ts` and now owns the scratch command buffer.

- [x] `main:build-mode-authority`
	- Current source: `src/app/client/src/systems/world/build-mode-authority/index.ts`
	- Current status: consumes `main:build-mode-command` output and shared command types from `src/libs/commands`.

- [x] `main:build-mode-presentation`
	- Current source: `src/app/client/src/systems/world/build-mode-presentation/index.ts`
	- Current status: correctly local-only.
	- Follow-up: keep ghost preview, HUD, and DOM wiring out of authoritative code.

- [x] `main:local-player-movement-intent`
	- Current source: `src/app/client/src/systems/core/local-player-movement-intent/index.ts`
	- Current status: already isolates local keyboard state into intent axes.
	- Follow-up: keep this system input-only.

- [x] `main:local-player-movement-command`
	- Current source: new system; extract from the current movement authority flow.
	- Goal: translate local movement intent into explicit movement commands.
	- Constraint: do not mutate `Transform2D`, animation state, or physics state here.
	- Current status: implemented in `src/app/client/src/systems/core/local-player-movement-command/index.ts` and emits shared `@libs/commands/movement` commands into a scratch command buffer.

- [x] `main:player-movement-authority`
	- Current source: `src/app/client/src/systems/core/movement/index.ts`
	- Goal: consume movement commands and apply authoritative transform + animation updates.
	- Move out: any local input reading.
	- Constraint: keep deterministic update behavior and preserve current player animation output.
	- Current status: now consumes `main:local-player-movement-command` output instead of reading local input directly.

- [x] `main:spatial-contexts-collision-authority`
	- Current source: `src/app/client/src/systems/world/scene-collision/index.ts`
	- Goal: keep collision resolution in the authoritative band because it changes world transforms.
	- Constraint: it must run after authoritative movement commands are applied and before portal/context checks.
	- Current status: authoritative collision system kept in the authoritative band and renamed to `main:spatial-contexts-collision-authority`.

- [x] `main:conveyor-entity-motion-authority`
	- Current source: `src/app/client/src/systems/world/conveyor-entity-motion/index.ts`
	- Goal: keep conveyor slot progression, transfers, and carried-item transform sync in the authoritative band.
	- Constraint: do not fold local-only visuals back into serializable lane state.
	- Current status: authoritative-only conveyor item progression retained and renamed to `main:conveyor-entity-motion-authority`.

- [x] `main:conveyor-movement-authority`
	- Current source: `src/app/client/src/systems/world/conveyor-movement/index.ts`
	- Goal: keep belt-driven actor movement authoritative because it mutates player transforms.
	- Constraint: order it after conveyor entity motion and before collision/portal resolution if the player can be pushed into new contacts.
	- Current status: authoritative belt-driven player movement retained and renamed to `main:conveyor-movement-authority`, ordered ahead of collision/portal checks.

- [x] `main:spatial-contexts-portals-authority`
	- Current source: `src/app/client/src/systems/world/portal/index.ts`
	- Goal: keep teleports authoritative because they mutate player location and world membership.
	- Constraint: the future server port must be able to execute this without browser globals.
	- Current status: portal activation remains query-driven and the system is now named `main:spatial-contexts-portals-authority`.

- [x] `main:context-focus-authority`
	- Current source: `src/app/client/src/systems/world/house-transition/index.ts`
	- Goal: keep context membership and player world moves authoritative.
	- Constraint: split blend-only presentation from actual world switching if that is still mixed.
	- Current status: authority now handles only context-region detection and world switching; roof-blend exit cleanup remains in house visuals.

- [x] `main:physics-world-sync`
	- Current source: `src/app/client/src/systems/core/physics-world-sync/index.ts`
	- Goal: classify this as a support system and verify it is safe to run before authoritative collision/portal systems.
	- Constraint: do not let it consume local-only UI state.
	- Current status: kept as a support system and moved to the top of the world scene ordering ahead of authoritative collision and portal systems.

- [x] `main:camera-follow`
	- Current source: `src/app/client/src/systems/core/camera-follow/index.ts`
	- Current status: local-only presentation system.
	- Follow-up: keep it after authoritative movement and context switching.

- [x] `main:camera-zoom`
	- Current source: `src/app/client/src/systems/core/camera-zoom/index.ts`
	- Current status: local-only presentation system.
	- Follow-up: keep it client-only.

- [x] `main:house-visuals`
	- Current source: `src/app/client/src/systems/world/house-visuals/index.ts`
	- Current status: local-only presentation system.
	- Follow-up: ensure it reads context state instead of mutating authoritative gameplay state.

- [x] `main:debug-overlay`
	- Current source: `src/app/client/src/systems/world/debug-overlay/index.ts`
	- Current status: local-only presentation/debug system.
	- Follow-up: keep debug entities out of replicated gameplay state.

- [x] `sync:serialization`
	- Current source: `src/libs/state-sync/src/system.ts`
	- Current status: adapter layer, not gameplay authority.
	- Follow-up: preserve this as an adapter band and later add a separate networking adapter rather than merging replication into gameplay systems.

### Recommended Implementation Order

Implementation: Do the splits in the order below so each later step depends on already-isolated behavior rather than forcing repeated rewrites.

1. Build-mode intent/command separation.
2. Movement command extraction.
3. Movement authority isolation.
4. Collision ordering around authoritative movement.
5. Conveyor authority isolation.
6. Conveyor-driven player movement ordering.
7. Portal authority isolation.
8. Context-focus authority isolation.
9. Final scene ordering cleanup into explicit support / intent / command / authoritative / local bands.

## 2. Build The Test Harness Before Networking

Current status:
- Complete. The deterministic world harness and camera assertions are now implemented and covering placement, deletion, movement, collision, and camera-follow behavior.

Implementation: Create a deterministic harness scene and shared test utilities before server work starts. Tests should be able to boot a known world, drive input, query entities and components, and assert placement, deletion, movement, collision, and camera behavior. This harness is required for the system split, and it must remain the foundation for later snapshot, diff, and multiplayer verification.

Things to consider:
- Add reusable world-query helpers instead of one-off debug hooks.
- Keep tests scene-specific and deterministic.
- Define camera assertions early so later browser verification matches test intent.

## 3. Keep A Single-Client Authority Phase

Implementation: After the split, move authority to the server while still supporting only one client. The server should own the simulation, and the client should become an input and render adapter over authoritative state. This phase must preserve the current core feature set: movement, placement, deletion, conveyor behavior, and world loading. It is acceptable for this version to feel slightly laggy.

Things to consider:
- Treat single-client parity as a required milestone, not a temporary stop.
- Do not add prediction or interpolation yet.
- Do not start multiplayer work until the single-client server-owned loop is stable.

## 4. Defer Spatial Context Work For The First Pass

Implementation: The first authoritative pass should target the overworld only. If house contexts, dungeon transitions, or other spatial-context behavior slow down the server port, disable them for this phase and keep the architecture ready for later restoration. Do not force partial multi-context support into the first milestone.

Things to consider:
- Scope the first server-owned world narrowly.
- Isolate context-specific setup so it can be turned off cleanly.
- Restore multi-context support only after the main authority flow is proven.

## 5. Run The Backend In Bun Through One Dev Entry Point

Current status:
- In progress. The repository now boots a Bun-native authoritative server entry in `src/app/server`, exposes `/multiplayer`, `/health`, and `/snapshot`, and proxies those routes through the Vite dev server. The next server step is replacing the bootstrap snapshot/diff scaffold with real command ingestion and replication flow.

Implementation: Run the server in `src/app/server` using Bun-native HTTP and websocket APIs. Frontend development should continue through Vite, but websocket traffic should be proxied through the same origin so the client connects to `/multiplayer`. The repository should start the full stack from one top-level `bun dev`, with Bun watch mode reloading the backend and Vite reloading the frontend.

Things to consider:
- Use `Bun.serve` and Bun websocket handlers directly.
- Keep same-origin websocket routing in development.
- Avoid a separate hard-coded backend URL for normal local work.

## 6. Move Authoritative Simulation To The Server

Current status:
- Not started yet. The Bun server entry point and websocket route are now in place, but the authoritative engine still needs to move behind that transport layer.

Implementation: Boot a headless engine on the server and move authoritative systems there. The server must own player entities, transforms, placement results, deletion, collisions, and conveyor outcomes. The client must stop mutating authoritative components directly and instead render replicated state coming from the server.

Things to consider:
- Keep server boot free of DOM, canvas, and browser-only assumptions.
- Make authoritative systems runnable without presentation dependencies.
- Treat the client as an adapter over server truth.

## 7. Convert Client Actions Into Commands

Current status:
- Complete. Movement and build-mode actions now flow through shared typed command schemas before reaching authority systems.

Implementation: Replace direct client mutation with explicit typed commands for movement, placement, deletion, and future interactions. The client should capture local intent, batch commands, and send them to the server at a fixed rate. The server should validate and apply those commands into the authoritative world.

Things to consider:
- Send intent, not mutated state.
- Keep commands small and explicit.
- Prevent replayed state application from generating new outgoing commands.

## 8. Hydrate A Snapshot Before Applying Live Diffs

Implementation: On connection, the server should send a full snapshot and baseline version, then continue sending live diff batches. The client should queue diffs during hydration, apply the snapshot first, replay queued diffs in order, and only then switch to live replication. This flow should be correct before multiplayer is added.

Things to consider:
- Version both snapshots and diff batches.
- Fail fast on impossible ordering or version drift.
- Do not assume hydration and live traffic cannot overlap.

## 9. Keep Presentation And Helpers Client-Only

Current status:
- Complete. Camera, build-mode presentation, overlays, HUD-oriented helpers, and persistence adapters remain outside the authoritative mutation path.

Implementation: Camera follow, zoom, login UI, HUD, overlays, preview ghosts, debug tools, and later smoothing or interpolation should remain local-only. These features may create local entities or local state, but they must not be required for authoritative simulation and must not leak into replicated gameplay state.

Things to consider:
- Mark local-only entities explicitly.
- Keep preview and overlay state non-replicated.
- Keep camera ownership tied to the local player only.

## 10. Define Camera Centering Precisely

Current status:
- Complete. The harness uses one centering rule and asserts camera/player transform alignment directly.

Implementation: Decide whether “centered” means the entity transform pivot or the rendered player body, and use that same rule everywhere. Anchored sprites can make these two definitions disagree visually even when numeric debug checks report success. Put the rule in a shared helper and use it for harness assertions, browser verification, and debugging tools.

Things to consider:
- Reuse one centering rule across code and tests.
- Assert both camera target math and final screen-space result.
- Do not let debug math measure a different point than the visible player.

## 11. Add Multiplayer Only After Single-Client Parity

Implementation: Once single-client authority is stable, add multiplayer with a minimal username-only login. The server should reject duplicate active usernames, create or restore a session per accepted user, and spawn or reconnect that player entity. This phase exists to prove shared authoritative state, not to introduce authentication.

Things to consider:
- Keep login rules simple and server-owned.
- Reject duplicate active usernames explicitly.
- Leave authentication and account systems out of scope.

## 12. Split Local Player And External Player Behavior

Implementation: After multiplayer exists, separate local-player handling from external-player rendering in code and tests. The local player owns input capture and camera follow. External players only reflect replicated authoritative state and must never affect the local camera.

Things to consider:
- Keep camera logic attached only to the local player.
- Render external players from replication only.
- Test local and external ownership separately.

## 13. Verify Shared Actions Across Clients

Implementation: Add cross-client verification for movement, placement, deletion, and conveyor outcomes. One client should act, another should observe the same committed result, and the harness should be able to assert those outcomes from authoritative state. The server must remain the only owner of conflict resolution.

Things to consider:
- Verify visibility of other-player actions, not just connection success.
- Keep first-write or simple conflict rules acceptable for MVP.
- Do not allow clients to assume success before server confirmation.

## 14. Keep Replication Layered On Top Of Engine Primitives

Implementation: Replication should be implemented as a consumer layered on top of engine serialization and dirty/diff primitives, not hard-coded into engine startup. The design must respect save, replicate, and dirty-tracking policy metadata so local-only or non-replicated fields stay out of network updates. It also must not assume that persistence and replication will always share one destructive queue consumer forever.

Things to consider:
- Keep replication outside engine core lifecycle when possible.
- Filter outgoing state with replication policy metadata.
- Leave room for persistence and replication to coexist later.

## 15. Required Test Coverage

Implementation: Ship tests per phase instead of relying on a single end-to-end path. Cover the system split, world-query harness utilities, grid placement and deletion, snapshot hydration, diff sequencing, single-client authority, duplicate username rejection, local-player camera ownership, external-player rendering, and shared multiplayer actions. Browser checks should confirm the same rules the harness asserts.

Things to consider:
- Add helper-level tests where math or ordering rules are easy to isolate.
- Add integration tests for snapshot-plus-diff sequencing.
- Use screenshots only as supporting evidence, not as the only assertion.

## 16. Non-Goals

Implementation: Keep the MVP deliberately narrow. Do not add prediction, interpolation, rollback, lag compensation, production authentication, relevance culling, binary transport, or full multi-context replication in this pass. The goal is a correct, understandable, slightly laggy authoritative foundation that another implementation pass can safely build on.

Things to consider:
- Prioritize ownership correctness over feel.
- Keep scope cuts explicit.
- Do not spend MVP time on polish that depends on later architecture.

## Delivery Criteria

Implementation: The MVP is complete when one top-level `bun dev` starts the stack, the client connects through the same-origin Vite proxy, the Bun server runs authoritative simulation, single-client parity is preserved, duplicate active usernames are rejected, external players replicate correctly, and the harness can assert placement, camera ownership, and replicated multiplayer state. If any of those conditions are missing, the foundation is not complete yet.

Things to consider:
- Require harness and browser verification before calling the work done.
- Require explicit local-player versus external-player ownership in code and tests.
- Do not accept a manual-only implementation with no stable verification path.