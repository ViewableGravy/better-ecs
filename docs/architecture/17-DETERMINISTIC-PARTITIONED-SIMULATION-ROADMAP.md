# 17 - Deterministic Partitioned Simulation Roadmap

## Goal

After the server-authoritative MVP is stable, move toward deterministic mirrored simulation for isolated gameplay partitions. The server remains authoritative, while clients run the same deterministic simulation for the partitions they currently need. This reduces bandwidth, keeps rendering decoupled from simulation, and preserves a recovery path when a client diverges.

This is not a replacement for the MVP in [16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md](/workspaces/better-ecs/docs/architecture/16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md). It is the intended follow-up once the single-client authoritative path is complete and verified.

## Core decisions

- The server remains the source of truth for all gameplay state.
- Clients may mirror authoritative simulation, but they do not become authoritative.
- Deterministic simulation should be scoped to explicit partitions such as a land claim or tightly-coupled set of touching claims.
- Cross-partition interaction must happen through explicit IO boundaries, not through arbitrary hidden reads into neighboring simulation.
- The simulation should be runnable in a worker on the client so the main thread stays focused on rendering and UI.
- Whole-world snapshots are acceptable during bootstrap, but the long-term protocol should be partition-scoped.
- Full-world lockstep is not the target. Per-partition scheduling, desync detection, and recovery are the target.

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

### 1. Server-authoritative mirrored simulation

- The server simulates every active partition.
- Each client receives the partitions it is allowed to observe or interact with.
- The client can run the same deterministic simulation locally for those partitions.
- The client renders local results, but authoritative correction still comes from the server.

### 2. Scheduled command application

- Clients send intent or typed commands, not mutated gameplay state.
- The server validates commands and assigns them to an exact authoritative tick.
- The server broadcasts the command plus scheduled tick to relevant clients.
- Clients apply the command on the scheduled tick.

This avoids immediate apply-on-receipt behavior and keeps all deterministic participants on the same command timeline.

### 3. Partition-scoped sync and recovery

- A new client hydrates from a partition snapshot plus version or tick metadata.
- After hydration, the client consumes scheduled commands for that partition.
- The server and client compare periodic deterministic hashes.
- On mismatch, the client must resync from a fresh authoritative snapshot or replay baseline.

### 4. Worker-first client execution

- The client simulation should move into a worker.
- The worker owns deterministic partition state and command replay.
- The main thread consumes compact state updates or render-friendly diffs.
- Do not post entire ECS graphs every tick.

## What this is not

- Not a pure Factorio-style whole-world lockstep session.
- Not a trust-the-client architecture.
- Not a removal of snapshots or diffs from the toolbox.
- Not a reason to stall all world simulation because one client is slow.

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
- All participants need compatible gameplay logic and content versions.

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
- Ensure replay order is exact and testable.

### Phase 4. Move client simulation into a worker

- Worker receives snapshot plus command schedule.
- Worker advances deterministic partition state.
- Main thread consumes compact diffs or render data.

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
- preserve snapshot-plus-diff infrastructure because it will still be needed for hydration and recovery,
- avoid gameplay systems that depend on implicit global reads when a partition boundary would be more appropriate.

## Success criteria

This direction is considered viable when the repository can demonstrate all of the following in at least one isolated partition:

- deterministic replay from the same command sequence,
- worker-hosted client simulation,
- scheduled command application by authoritative tick,
- periodic client or server hash comparison,
- successful resync after intentional divergence,
- no gameplay dependence on hidden state outside the partition boundary.