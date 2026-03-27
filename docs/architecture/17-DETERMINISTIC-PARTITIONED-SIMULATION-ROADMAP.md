# 17 - Deterministic Partitioned Simulation Roadmap

## Goal

After the server-authoritative MVP is stable, move toward deterministic mirrored simulation for isolated gameplay partitions on top of the shared command adapter. The server remains authoritative, while clients run the same deterministic simulation for the partitions they currently need. This reduces bandwidth, keeps rendering decoupled from simulation, and preserves a recovery path when a client diverges.

For the first deterministic pass, clients are allowed to hydrate while far behind the server, then enter a catch-up phase that advances simulation as fast as needed until they reach a configurable lag window behind the authoritative server tick. The goal is not immediate lockstep-on-connect. The goal is controlled mirrored execution with explicit bootstrap, catch-up, live, and recovery states.

This is not a replacement for the MVP in [16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md](/workspaces/better-ecs/docs/architecture/16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md). It is the intended follow-up once the single-client authoritative path is complete and verified. The concrete protocol split lives in [18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md](/workspaces/better-ecs/docs/architecture/18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md).

## Core decisions

- One shared command adapter is the networking foundation for both replicated actors and deterministic partitions.
- The server remains the source of truth for all gameplay state.
- Clients may mirror authoritative simulation, but they do not become authoritative.
- Low-churn actor replication remains allowed for entities such as players and NPCs when deterministic replay is unnecessary.
- Deterministic simulation should be scoped to explicit partitions such as a land claim or tightly-coupled set of touching claims.
- Cross-partition interaction must happen through explicit IO boundaries, not through arbitrary hidden reads into neighboring simulation.
- The simulation should be runnable in a worker on the client so the main thread stays focused on rendering and UI.
- Whole-world snapshots are acceptable during bootstrap, but the long-term protocol should be partition-scoped.
- Full-world lockstep is not the target. Per-partition scheduling, desync detection, and recovery are the target.
- Partition-local readiness barriers are the preferred mechanism for verifying that mirrored participants execute a given scheduled input on the same logical cycle.
- Mirrored clients should intentionally run some number of ticks behind the server inside a configurable lag window rather than trying to sit on the exact head tick.
- Catch-up or "hyperdrive" behavior is a client sync policy built on top of the protocol, not the protocol itself.
- Rendering does not need to stay coupled to mirrored simulation during hydration or catch-up. It is acceptable for a partition to suppress normal rendering until it reaches a live-ready lag window.

## Why partitioned deterministic simulation fits this game

The strongest enabler is the claim-local automation assumption:

- Deterministic factory-style systems should live entirely within one land claim or an explicitly connected claim cluster.
- Simulation inside that partition should not depend on hidden state elsewhere in the world.
- External interaction should happen only through explicit boundary adapters such as train exchange, logistics IO, or later inter-partition transfer queues.

That lets the game treat each partition as an independent simulation cell:

- the server can simulate it authoritatively,
- the client can mirror it locally,
- world partitioning becomes a loading and ownership problem instead of a fundamental gameplay rewrite.

## Target architecture

### 0. Bootstrap, lag window, and catch-up policy

- A connecting client may hydrate from a whole-world or partition-scoped snapshot while arbitrarily far behind the server.
- Snapshot delivery should include enough authoritative tick metadata for the client to know where its mirrored baseline starts.
- After hydration, the client enters a catch-up or "hyperdrive" phase where it advances deterministic simulation faster than normal until its local applied tick enters the configured lag window behind the authoritative server tick.
- Once the client is inside that lag window, it enters normal live mirrored execution and enables normal rendering for that partition.
- If the client later falls too far behind, it should re-enter catch-up. If it runs ahead of the server, it should slow or pause mirrored advancement instead of extrapolating unsupported future ticks.
- The recommended control signal per partition is the difference between authoritative server tick and local applied tick, not wall-clock latency alone.

### 1. Server-authoritative mirrored simulation

- The server simulates every active partition.
- Each client receives the partitions it is allowed to observe or interact with.
- The client can run the same deterministic simulation locally for those partitions.
- The client renders local results, but authoritative correction still comes from the server.

This deterministic path coexists with low-churn authoritative replication for other actor categories. Not every entity in the game needs to be mirrored deterministically.

### 2. Scheduled command application

- Clients send intent or typed commands, not mutated gameplay state.
- The server validates commands and assigns them to an exact authoritative tick.
- The server broadcasts the command plus scheduled tick to relevant clients.
- Relevant clients confirm readiness for that partition tick.
- The server issues a commit or run signal for the partition tick once readiness policy is satisfied.
- Clients apply the command on the scheduled tick.

This avoids immediate apply-on-receipt behavior and keeps all deterministic participants on the same command timeline.

Readiness for a scheduled tick is not the same thing as catch-up status. A client may be healthy overall yet still not be ready for one future partition tick because it is missing a baseline, prior commands, or version compatibility.

The readiness barrier must stay partition-local. Do not freeze the whole world because one client cannot advance one partition.

### 3. Partition-scoped sync and recovery

- A new client hydrates from a partition snapshot plus version or tick metadata.
- After hydration, the client consumes scheduled commands for that partition.
- The client reports progress infrequently enough to stay cheap, but often enough for the server and client to detect when the mirrored partition has drifted outside the allowed lag window.
- The server and client compare periodic deterministic hashes.
- On mismatch, the client must resync from a fresh authoritative snapshot or replay baseline.

Snapshot and resync traffic remain required even in a command-driven architecture. A command stream alone is not enough for late join, reconnect, or recovery.

### 4. Worker-first client execution

- The client simulation should move into a worker.
- The worker owns deterministic partition state and command replay.
- The main thread consumes compact state updates or render-friendly diffs.
- Do not post entire ECS graphs every tick.

The worker should also own mirrored partition sync state such as:

- local applied tick,
- most recent authoritative server tick,
- catch-up status,
- pending scheduled commands,
- last confirmed baseline or snapshot version,
- periodic deterministic hash generation.

That keeps main-thread rendering and UI decoupled from the details of deterministic recovery and tick pacing.

## What this is not

- Not a pure Factorio-style whole-world lockstep session.
- Not a trust-the-client architecture.
- Not a removal of snapshots or diffs from the toolbox.
- Not a reason to stall all world simulation because one client is slow.
- Not a reason to force low-churn actor replication into the deterministic path.

## Requirements before implementation

### 1. Determinism contract

Authoritative and mirrored simulation need an explicit contract:

- fixed-step timing only,
- no wall-clock-driven gameplay mutation,
- stable system ordering,
- stable query or iteration order where gameplay depends on ordering,
- seeded or otherwise deterministic randomness,
- no hidden browser-only behavior in authoritative systems,
- no async side effects that mutate gameplay state outside scheduled ticks.

### 2. Numeric discipline

Factory simulation should avoid free-running float drift.

- Prefer integer tick counters for timing.
- Prefer quantized or fixed-point authoritative progress where possible.
- Keep interpolation and render smoothing separate from gameplay truth.

### 3. Explicit partition model

The runtime needs a first-class partition concept with:

- partition id,
- ownership and visibility rules,
- authoritative tick,
- target lag window,
- snapshot version,
- IO boundaries,
- handoff rules when a player moves between partitions.

### 4. Hashing and recovery

Deterministic mirroring is only viable if desync is detectable and recoverable.

- generate periodic state hashes per partition,
- compare client and server hashes,
- resync from authoritative state when they diverge,
- keep replay and hydration flows versioned and ordered.

## Major risks and edge cases

### Slow or missing clients

Do not freeze the whole world while waiting for every client to acknowledge a command. That model is too brittle for an MMO-shaped game.

Preferred direction:

- the server schedules commands on future ticks,
- clients report partition progress and catch-up state independently from per-tick readiness,
- readiness is checked per partition for clients that are expected to mirror that partition,
- partitions continue under server authority,
- lagging clients catch up or resync,
- only the affected partition should ever risk local interruption.

### Cross-partition systems

These systems need explicit rules before they can scale:

- trains,
- power,
- logistics or fluid networks,
- portals and context transitions,
- AI that can reason across partition boundaries,
- markets or other shared economic systems.

If they can read arbitrary world state every tick, partitioning will not hold.

### Late join, reconnect, and version skew

- A command stream alone is not enough for late join.
- Clients need snapshots plus ordered command continuation.
- Clients also need authoritative tick metadata so they can decide whether to stay hydrating, enter catch-up, or start live mirrored execution.
- All participants need compatible gameplay logic and content versions.

## Client sync states

Each mirrored partition should have an explicit sync state machine. Suggested states:

- `hydrating`: baseline snapshot is being applied and live scheduled commands may still be buffering.
- `catching-up`: simulation runs faster than normal until the local applied tick enters the configured lag window.
- `live`: simulation runs at normal fixed-step rate while staying within the lag window and rendering normally.
- `desynced`: the partition is no longer considered safe to mirror because of hash mismatch, version gap, or missed readiness.
- `resyncing`: the client is waiting for or applying a fresh authoritative baseline before re-entering catch-up.

The protocol should expose enough information to drive this state machine, but the exact transition policy belongs to the client sync controller rather than the wire format itself.

### Security and cheating

- Clients may simulate, but they do not report authoritative results.
- The server validates commands and remains the owner of committed state.
- Mirrored simulation is a performance and bandwidth optimization, not a trust model.

## Recommended implementation phases

### Phase 1. Finish the authoritative MVP

Complete the work in [16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md](/workspaces/better-ecs/docs/architecture/16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md) first. Do not split attention between MVP parity and deterministic mirroring at the same time.

### Phase 2. Prove deterministic replay in one process

- Run the same authoritative command sequence twice.
- Confirm that the resulting state and hash match.
- Add targeted tests around conveyors, placement, movement, and other claim-local simulation.

### Phase 3. Introduce partition-aware scheduling

- Define partition ids and authoritative ticks.
- Schedule validated commands against future ticks.
- Introduce the ready or commit barrier for mirrored participants.
- Ensure replay order is exact and testable.
- Introduce partition progress reporting so the server and client can reason about lag-window health without relying on per-command acknowledgements.

### Phase 4. Move client simulation into a worker

- Worker receives snapshot plus command schedule.
- Worker advances deterministic partition state.
- Main thread consumes compact diffs or render data.
- Worker owns catch-up pacing and the partition sync state machine.

### Phase 5. Add hash-based desync detection

- Compute deterministic partition hashes on an interval.
- Compare server and client results.
- Trigger resync on mismatch.

### Phase 6. Narrow interest scope and introduce real partition loading

- Stop assuming whole-world delivery.
- Hydrate only nearby or relevant partitions.
- Keep snapshots, command streams, and resync partition-scoped.

## Immediate design guidance for current work

Even before phase 17 begins, current implementation should avoid backing into a dead end:

- keep authoritative systems deterministic where practical,
- keep rendering and simulation separate,
- keep commands explicit and small,
- keep one shared command adapter at the center of the networking runtime,
- introduce an app-level network manager above the shared adapter so application code can send `realtime` and `simulation` messages without owning transport details,
- keep per-partition `authoritativeServerTick - localAppliedTick` as a first-class runtime signal,
- allow low-churn actor replication to remain a separate concern from deterministic simulation,
- preserve snapshot-plus-diff infrastructure because it will still be needed for hydration and recovery,
- avoid gameplay systems that depend on implicit global reads when a partition boundary would be more appropriate.

## Success criteria

This direction is considered viable when the repository can demonstrate all of the following in at least one isolated partition:

- deterministic replay from the same command sequence,
- worker-hosted client simulation,
- scheduled command application by authoritative tick,
- partition-local readiness verification before deterministic tick execution,
- periodic client or server hash comparison,
- successful resync after intentional divergence,
- no gameplay dependence on hidden state outside the partition boundary.