# 16 - Server Authoritative MVP Investigation

## Purpose

Evaluate the first multiplayer pass for Better ECS and decide whether to:

- ship a temporary client-hosted authoritative mode first, or
- go directly to a real server-authoritative architecture.

This document is intentionally grounded in the current repository shape rather than generic networking advice.

## Recommendation

Go directly to a server-authoritative MVP.

Do not spend time on a client-authoritative host model unless the goal is only a very short-lived demo.

### Why

The hard work in this repository is not "opening sockets." The hard work is:

- splitting shared simulation from client-only systems,
- turning client input into network commands,
- defining ownership and replication scope,
- handling initial snapshot plus live diff stream,
- preventing persistence and replication consumers from fighting over the same dirty queue,
- deciding what state is authoritative versus local presentation.

Those are the same core problems whether the first authority lives in a browser tab or in the server app.

If we build a client-hosted stopgap first, we still have to do the real authority split later, and we take on extra rework:

- authority starts in the wrong process,
- host-only assumptions leak into system code,
- reconnect and host migration become accidental concerns,
- client-only UI and input stay coupled to authoritative mutation longer than they should.

For this codebase, the direct server-authoritative path is the cleaner first pass.

## Current Repository Facts

### What already helps

- The engine can run headless. `createEngine(...)` accepts no `rootElement`, and the main loop falls back to `setTimeout(...)` when `window.requestAnimationFrame` is unavailable.
- Dirty tracking and ordered diff commands already exist in the engine.
- Scene snapshot serialization already exists.
- Diff replay already exists.
- The current `serializationSystem(...)` shape is a reasonable model for persistence and future replication consumers.
- The built-in input system already no-ops its browser event registration on the server.

### What is not ready yet

- The server app is only a placeholder.
- There is no socket transport or network adapter.
- The current sync flow is persistence-first, not multiplayer-first.
- The current dirty queue is effectively single-consumer in practice because output adapters drain it destructively.
- `save`, `replicate`, and `dirtyTracking` policy axes exist, but current dirty queue emission only respects `dirtyTracking`. No current code applies replicate-mode filtering to outgoing commands.
- The main client scene mixes authoritative simulation, input-driven mutation, DOM setup, persistence, debug systems, and local preview behavior in one profile.

## Consequence For Architecture

The first pass should not be "add sockets to the client." It should be:

1. create a headless server engine profile,
2. move authoritative mutation to that server profile,
3. keep clients as render and input adapters,
4. send commands from client to server,
5. send snapshot plus authoritative diffs from server to clients.

## Architectural Direction Locked In

### Engine versus replication ownership

The engine should provide primitives for replication, not replication policy.

The engine is allowed to know about:

- dirty and diff primitives,
- queue creation and consumption primitives,
- allocator and pooling primitives,
- serialization policy metadata from decorators,
- opt-in attachment points for persistence or replication consumers.

The engine should not directly own:

- concrete replication logic,
- connection management,
- session routing,
- transport semantics,
- application-level replication rules.

Those should live in opt-in attachments, adapters, or plugins layered on top of engine primitives.

In practice, the desired shape is:

- engine exports queues, diff primitives, allocator primitives, and interfaces,
- state decorators expose policy metadata such as `save` and `replicate`,
- persistence and replication systems consume those primitives,
- app or package code chooses which consumers are attached.

## Recommended MVP Shape

### Server

- Run one headless engine instance in `src/app/server`.
- Start one authoritative scene/world.
- Accept WebSocket connections.
- Require a simple username during connect.
- Create a server-side session record for each connection.
- Use a server-generated UUID as the session identity.
- Treat the entered username as display name only.
- Reuse the same UUID and player entity when the same username reconnects.
- If the same username connects while already connected, minimum-MVP behavior is acceptable even if crude. Crashing or refusing to handle that case is acceptable for now.
- Apply validated client commands into the authoritative world.
- Broadcast initial snapshot on join.
- Broadcast authoritative diff commands after join.
- Run the server update rate at `60` UPS.
- Simulate the overworld at all times.
- Do not worry about other worlds for the first multiplayer pass.

### Client

- Show a minimal login screen with username entry.
- Connect to the server over WebSocket.
- Load the scene and wait for initial snapshot.
- Apply server snapshot.
- Apply live diff commands after snapshot.
- Send input or gameplay intent commands to the server.
- Keep local-only UI, camera, HUD, and visual feedback on the client.
- Keep client render at `120` FPS.
- Send commands at `60` Hz for now.
- Allow any non-empty username string.

### Transport

- Use JSON first.
- Use one connection type.
- Use explicit message envelopes, for example:
  - `hello`
  - `hello-ack`
  - `snapshot`
  - `diff-batch`
  - `command`
  - `disconnect-reason`
  - `ping`
  - `pong`

### Prediction and interpolation

- Skip client prediction for MVP.
- Skip interpolation for MVP.
- Accept visible latency for the first pass.

That is a valid first milestone as long as the architecture stays authority-correct.

## Input To Commands

Because server authority will convert more and more gameplay into intent messages, the command layer should be treated as a first-class engine-adjacent primitive, not as ad hoc object literals created in random systems.

### Command registry requirement

Create a shared command registry or pool that is:

- type-safe,
- reusable by engine and game code,
- compatible with custom app-level commands,
- aligned with existing pooling patterns,
- designed so input systems and gameplay systems can allocate commands without hot-path garbage.

This should not be render-specific. The same general allocator concept is useful for systems and networking, not only render.

### Allocator direction

The current `FrameAllocator` idea is useful, but its conceptual scope is too narrow if it remains render-only.

The better direction is a shared allocator model with at least two lifetimes:

- `frame` allocations:
  - intended to live only for the current frame or tick window,
  - never individually removed from the pool,
  - ideal for command batches that should not survive past immediate processing.
- `multi-frame` allocations:
  - intended to survive across frames when unavoidable,
  - explicitly checked back into the pool or released,
  - useful for queued work that might outlive the current update tick.

### Lifetime rule

Document this strongly:

- frame-allocated objects must not be retained across render or update boundaries.

That rule cannot be perfectly enforced at runtime, but it should be an explicit contract.

### Command pool direction

For multiplayer MVP, command objects should ideally be frame-lifetime only:

- input captures or derives command objects,
- client batches and sends them,
- server validates and applies them,
- command objects are released.

If a small number of commands need to survive longer, those should use the multi-frame allocation path deliberately rather than quietly leaking frame-lifetime objects across ticks.

### Type shape direction

The registry should support command families such as:

- movement intent,
- build intent,
- delete intent,
- handshake or session commands,
- future game-specific custom commands.

The important architectural point is that command creation should be centralized and typed, while command transport and execution remain separate concerns.

## Why A Middle Ground Is Not Worth It Here

The only real benefit of a temporary client-authoritative host is reduced first-pass implementation effort.

In this repository, that reduction is smaller than it looks because the major effort is still the ownership split. The current systems directly mutate world state from client input. That work has to move anyway.

The only case where the temporary host model is justified is this:

- you want a throwaway demo in the next day or two,
- you are comfortable deleting the networking layer afterward,
- you explicitly do not care about reuse.

If the goal is the actual foundation for multiplayer, skip the middle step.

## Key Edge Cases And Considerations

### 1. Simulation Ownership Split

- The current main scene is not server-safe as-is.
- Some systems are clearly authoritative simulation candidates.
- Some systems are clearly client-only.
- Some systems currently mix both responsibilities and need refactoring.

Likely authoritative or mostly authoritative:

- movement and gameplay mutation,
- conveyor movement,
- collision,
- world placement commit and delete,
- context transitions if they affect shared world state,
- any persistent state mutation.

Likely client-only:

- DOM initialization,
- login UI,
- HUD,
- local camera follow and zoom,
- debug overlays,
- local preview-only visuals,
- editor-only behaviors.

Risk:

- if server and client both keep mutating the same authoritative components, state divergence is guaranteed.

### 2. Input Must Become Commands

The current client movement system reads `engine:input` and directly mutates `Transform2D`.

That is incompatible with server authority.

For the first pass, the client should send commands such as:

- move intent,
- stop intent,
- place item intent,
- delete intent,
- scene interaction intent.

The server should validate and apply those commands.

Risk:

- if the client keeps mutating local world state first and then also applies server diffs, you get double-application, rubber-banding, or both.

### 3. Snapshot Plus Live Diff Race

Late join requires an initial snapshot plus ongoing authoritative updates.

The important race is:

- server serializes snapshot,
- world changes before client finishes applying it,
- client then receives newer diffs.

Locked approach for MVP:

- begin streaming immediately,
- queue incoming diffs on the client while snapshot hydration is happening,
- once hydration completes, apply queued diffs in order,
- then switch the client into normal live application mode.

This should still carry an explicit version boundary so queued diffs are guaranteed to start after the snapshot baseline.

If this is ignored, late joiners can miss state changes or apply them in the wrong order.

### 4. Dirty Queue Fan-Out

Today, output adapters drain the queue destructively.

That is fine for one persistence consumer.

It is not fine if both persistence and replication need to consume the same authoritative changes.

This now needs a deeper design decision because the server should eventually both:

- persist authoritative world changes, and
- replicate authoritative world changes to clients.

There are several viable options.

#### Option A. One append-only change store plus consumer cursors

Shape:

- engine emits commands once into a shared append-only store or log,
- each consumer tracks its own read cursor or ack position,
- persistence and replication read independently,
- pruning happens only after all interested consumers have advanced past a range.

Pros:

- no duplicate command emission,
- consumers do not starve each other,
- good conceptual model for future persistence plus replication plus debugging consumers,
- naturally fits versioned diff streaming.

Cons:

- more engine primitive work up front,
- requires retention and pruning policy,
- a little more stateful than a simple drain queue.

Assessment:

- this is the cleanest long-term primitive.

#### Option B. Multiple purpose-specific queues produced at write time

Shape:

- engine tracks multiple queue types such as `persist`, `replicate`, or similar,
- state policy determines which queues receive each command,
- each queue can drain independently.

Pros:

- simple consumer model,
- easy mental mapping between policy and destination,
- no cursor management.

Cons:

- duplicates commands across queues,
- more memory traffic,
- harder to add new consumers without increasing duplication,
- engine becomes more aware of queue purpose names.

Assessment:

- viable for MVP if kept generic, but it risks pushing destination semantics too far into the engine.

#### Option C. One drain queue plus fan-out broker outside the engine

Shape:

- engine keeps a single generic dirty queue,
- one attached broker system drains it,
- the broker fans commands out to persistence and replication sinks.

Pros:

- minimal engine changes,
- keeps replication and persistence logic outside the engine,
- good MVP stepping stone.

Cons:

- broker becomes a hidden central dependency,
- replay or backpressure logic becomes broker-owned,
- if the broker is not designed carefully, it becomes ad hoc infrastructure.

Assessment:

- this is the cheapest MVP option if we want to keep engine changes small.

#### Option D. One queue with peek plus explicit consumer-managed ack

Shape:

- consumers read from a shared queue without draining,
- a separate ack or release mechanism removes items only when all required consumers are done.

Pros:

- similar benefits to cursors,
- can keep current queue API shape closer to what exists.

Cons:

- harder to reason about than a proper append-only log,
- can become awkward if consumers appear or disappear dynamically.

Assessment:

- reasonable, but likely less clean than explicit consumer cursors.

### Queue recommendation

Best long-term direction:

- a generic append-only change store with consumer cursors.

Best minimum-MVP direction if we want lower implementation cost:

- keep the engine generic and add one external broker consumer that drains once and fans out to replication and persistence sinks.

If you want engine-level multiple queues, keep them generic rather than naming them after concrete product concerns. For example, avoid hard-coding replication logic into the engine even if you expose multiple queue channels.

If this is not decided up front, one consumer will starve the other.

### 5. Replication Filtering Is Not Implemented Yet

The serialization system already models `save`, `replicate`, and `dirtyTracking`, but current queue emission is dirty-tracking-based, not replication-filtered.

That means a network adapter cannot just blindly forward dirty commands if you expect:

- local-only state to stay local,
- non-replicated fields to stay local,
- owner-only state to stay private.

Needed decision:

- where replication filtering lives.

Likely choices:

- in the network adapter,
- in a dedicated replication consumer layer,
- eventually in engine-level filtered diff generation.

Locked direction:

- replication logic should stay outside the engine,
- decorator metadata should inform consumers,
- replication and persistence adapters should be opt-in attachments layered on engine primitives.

### 6. Entity Scope And Per-Connection Visibility

This repository already points toward entity-level scope ideas such as:

- shared,
- owner-only,
- local-only.

That matters immediately for multiplayer because not all entities should go to all clients.

Examples:

- shared player entities should replicate to everyone,
- owner-only UI helper entities should only replicate to the owning client,
- local ghost previews should not replicate at all,
- multiplayer-visible previews need an explicit authoritative/shared shape.

Risk:

- if scope is undefined, you will either leak private state or over-replicate noisy client-only entities.

For MVP, keep this simple:

- shared gameplay entities replicate,
- local-only preview entities do not,
- do not build out a large security or privacy model yet.

### 7. Build Mode And Ghost Previews

The current build mode flow uses local ghost ownership and preview-world behavior.

This needs an explicit decision:

- keep previews fully local in MVP,
- or make them shared authoritative previews.

Locked decision for MVP:

- keep placement previews local-only,
- do not make other-player ghosts visible in the first pass,
- only replicate committed placement results.

Reason:

- it removes a large class of owner-only and shared-preview edge cases from the first pass.
- shared previews are still a desired later feature, so the architecture should avoid making them impossible.

### 8. Camera And Local Presentation

Camera follow, zoom, HUD, overlays, and other client presentation systems should remain local.

They should observe authoritative replicated state, not become part of it.

Risk:

- if camera or UI helper entities get mixed into shared simulation state, replication noise and ownership bugs will grow quickly.

### 9. Scene Setup And Asset Loading On The Server

The current world scene setup performs asset loading and loading-overlay work that is browser-facing.

A server engine profile likely needs:

- a server scene variant,
- or a shared scene setup split into simulation setup versus client asset setup.

Risk:

- if the server boot path keeps browser or asset presentation assumptions, headless startup will be brittle or fail outright.

### 10. Username And Identity Rules

If the login is only a username field, decide these rules up front:

- are duplicate usernames allowed,
- does reconnect with the same username reclaim the same player,
- is username just display text or also the identity key,
- what happens if a disconnected username reconnects while the old session still exists.

Locked decision for MVP:

- username is display name only,
- the server generates a UUID session identity under the hood,
- reconnect with the same username maps back to the same UUID and player entity,
- allow any non-empty username string,
- do not spend time on stronger validation or authentication yet.

### 11. Player Lifecycle

Decide what happens on:

- first join,
- disconnect,
- reconnect,
- duplicate connection,
- server restart.

Questions to resolve:

- does a player entity despawn immediately on disconnect,
- does it persist for a grace period,
- does reconnect restore the same entity or spawn a new one.

Locked decision for MVP:

- on disconnect, keep the player around for `1` minute,
- reconnect with the same username should restore the same UUID and the same player entity,
- if another local user takes the same username after disconnect, minimum-work behavior is acceptable even if it is wrong,
- if the same username is connected twice concurrently, do not spend time handling it robustly.

### 12. Command Validation

Server-authoritative only works if the server refuses invalid commands.

Examples:

- move commands that exceed allowed speed,
- build commands without required inventory,
- placement in blocked cells,
- delete commands for entities the player should not affect,
- context changes the player should not be able to trigger.

Locked decision for MVP:

- do basic server-authoritative validation only,
- validate enough to preserve authoritative correctness,
- do not build a large validation or anti-cheat framework yet.

### 13. Conflict Resolution Between Players

The moment two clients can act on the same world, conflicts become real.

Examples:

- both players place on the same cell,
- one deletes while another modifies,
- one interacts with an entity that was just destroyed,
- two clients attempt to own the same preview or tool state.

The server needs deterministic conflict behavior.

Locked decision for MVP:

- first-write semantics are acceptable.

### 14. Tick Rate And Perceived Input Latency

The current client runs at `fps: 120` and `ups: 120`.

For server authority, decide:

- server UPS,
- client render FPS,
- client command send frequency,
- whether commands are event-driven or sent every tick.

Without prediction or interpolation, lower server UPS directly increases perceived input lag.

Locked decision for MVP:

- server UPS is `60`,
- client render target remains `120`,
- client command send rate is `60`,
- accept the more rigid feel of no-prediction, no-interpolation movement.

### 15. Ordering, Reliability, And Resync

WebSockets give ordered delivery per connection, but that does not solve all problems.

You still need to define:

- snapshot versioning,
- what happens if a client falls too far behind,
- whether the client can request a resnapshot,
- how the client detects it applied an impossible diff.

Recommendation for MVP:

- add monotonic batch version numbers,
- disconnect or resnapshot on detected mismatch,
- prefer explicit failure over silent divergence.

### 16. Applying Diffs On Clients Without Feedback Loops

This is mostly supported already because diff replay suspends tracking during apply.

Still, the client architecture must avoid re-broadcast style mistakes such as:

- client applies server diff,
- local systems observe change and emit a new outgoing command for the same change,
- server receives echoed intent.

Input and command generation should be intent-driven, not state-diff-driven.

### 17. Scene And Context Replication

This repository uses spatial contexts and multiple worlds per scene.

That introduces multiplayer-specific questions:

- does the server simulate all contexts all the time,
- do all clients receive all contexts,
- do clients only receive currently relevant contexts,
- how are context transitions replicated.

Locked decision for MVP:

- simulate the overworld at all times,
- do not worry about other worlds for the first pass,
- keep the architecture flexible enough to add them later.

### 18. Persistence Interaction

Right now persistence is a client-side scene consumer.

Under server authority, decide whether persistence becomes:

- server-owned only,
- disabled for the first multiplayer pass,
- or temporarily single-player only.

Persistence remains a follow-up concern, but the queue and consumer architecture must not block eventual server-owned persistence.

### 19. Single Engine Registration Constraint

The engine currently enforces one globally registered engine per process unless manual registration is used.

Runtime implication:

- one server engine per server process is fine.

Testing implication:

- multi-engine tests in one process need manual registration discipline.

This is not a blocker, but it matters for test harness design.

### 20. Development Workflow

Your requested workflow is:

- run backend,
- run frontend,
- open two browser clients,
- log in with two usernames,
- verify both clients share the same authoritative world.

That is a good MVP target, but the repo will need:

- a real server bootstrap,
- a dev command for server plus client together or separately,
- clear port coordination,
- a login route or WebSocket handshake,
- a repeatable two-browser test flow.

### 21. Network Payload Format

JSON is the right first choice here.

Binary diff support exists in the engine, but using it immediately would increase debugging cost and reduce visibility during the first pass.

Recommendation for MVP:

- JSON snapshots,
- JSON diff batches,
- binary later if profiling proves it necessary.

### 22. Asset Identity And Client Rendering

The server should not become responsible for presentation assets.

But the server may still replicate authoritative component data that references asset ids or render-relevant component state.

So you must guarantee:

- clients know how to render all replicated asset references,
- missing assets fail clearly,
- asset loading does not gate server simulation.

### 23. Security And Abuse Surface

For this MVP, security is explicitly not a concern because the target environment is local development.

That means:

- do not spend time on hardening,
- do not design around hostile clients yet,
- keep the architecture clean enough that real security can be layered in later.

Server-authoritative correctness checks still matter, but security work is out of scope.

## Recommended Non-Goals For MVP

Do not include these in the first pass unless they fall out almost for free:

- client prediction,
- interpolation,
- rollback,
- lag compensation,
- host migration,
- multi-room matchmaking,
- production auth,
- binary transport optimization,
- relevance culling by distance,
- persistence and replication both consuming the same queue without a new ownership model.

## Suggested First-Pass Decisions To Lock Before Implementation

- One authoritative server process.
- One shared world or scene session.
- Username is display-only, while the server maps it to a generated UUID session identity.
- Full snapshot on join.
- Start live diff streaming immediately, queue diffs client-side during hydration, then apply queued diffs in order after snapshot hydration completes.
- JSON transport only.
- No interpolation or prediction.
- Movement and build commit go through server commands.
- Local previews remain local-only.
- Camera, HUD, overlays, and debug remain client-only.
- Basic server-authoritative validation only.
- First-write conflict behavior is acceptable.
- Server UPS is `60`.
- Client render remains `120`.
- Client command send rate is `60`.
- Simulate the overworld only for the first pass.
- Security hardening is out of scope for this local MVP.
- Replication remains outside the engine and attaches through opt-in consumers or plugins.
- The command layer should use a shared typed registry and allocator model rather than ad hoc literals.
- Queue architecture must support future persistence plus replication without silent destructive-drain conflicts.

## Open Questions To Answer Before The First Pass

- Which queue primitive do we want first:
  - shared append-only store with consumer cursors,
  - engine-level multiple generic queues,
  - or one external broker that drains once and fans out?
- How much of the command allocator and typed registry should live in engine versus a multiplayer package?
- For same-username concurrent connect, do we want to crash, reject, or allow duplicate temporary behavior during implementation?
- Is persistence attached in the first implementation pass, or only designed for and added later?

## Final Call

The correct direction for this repository is a direct server-authoritative MVP.

The current engine and serialization work already support the important primitives:

- headless engine execution,
- scene snapshots,
- authoritative diff generation,
- diff replay.

The real missing work is the authority split, typed command infrastructure, snapshot-plus-diff hydration flow, replication filtering, and queue-consumer design. Those are foundational and should be done once, in the correct direction, rather than hidden behind a temporary client-hosted authority model.