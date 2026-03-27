# 18 - Hybrid Command Networking Protocol

## Goal

Define one networking foundation that can support both of the multiplayer models this project needs:

- authoritative low-churn replication for actors such as players and NPCs,
- deterministic partition simulation for factory-style systems such as belts, carried items, and other claim-local automation.

The shared base is a bidirectional command adapter that can send and receive typed messages. Replication and deterministic simulation are systems built on top of that adapter, not competing transports.

## Core rule

Do not treat raw ECS diffs as the universal gameplay protocol.

- Use typed commands for gameplay intent and scheduling.
- Use snapshots for bootstrap, reconnect, and resync.
- Use selective replication for low-churn authoritative state.
- Use partition-scoped scheduled commands for deterministic simulation.

## Layered model

### 1. Transport and session layer

This layer owns connection lifecycle and message delivery.

Responsibilities:

- connect and authenticate a session,
- assign a client id,
- negotiate content or protocol version,
- provide reliable ordered delivery for gameplay messages,
- expose one adapter API to the rest of the game.

The adapter API should not care whether the caller is using low-churn replication or deterministic simulation.

### 2. Shared command layer

This is the common language for all higher-level systems.

Message families:

- client intent commands,
- server acknowledgements or rejections,
- server scheduled commands,
- readiness and tick-control messages,
- snapshot and resync control messages,
- optional low-churn replicated state messages.

At this level, a command is not limited to player input. It can also represent a server-issued instruction such as "apply this build command on tick 420" or "prepare partition P for tick 421".

### 3. Low-churn authoritative replication layer

This layer is for entities whose authoritative state can be replicated directly without needing deterministic replay.

Examples:

- player transform and animation state,
- NPC transform and high-level state,
- presence, login, ownership, and camera-relevant data,
- other actor state that is cheap to correct and not worth simulating on every client.

Rules:

- keep the replicated payload narrow,
- prefer actor-level or feature-level state over raw whole-world ECS churn,
- use snapshots for join or reconnect,
- allow the server to update this state independently from deterministic partition ticks.

This is where entity replication belongs when the entity is low churn or when exact mirrored simulation is unnecessary.

### 4. Deterministic partition simulation layer

This layer is for simulation that must execute on all participating parties on the same logical tick.

Examples:

- belts,
- items on belts,
- claim-local factory logic,
- other systems where bandwidth would explode if every mutation were replicated directly.

Rules:

- clients do not author authoritative results,
- the server validates input and chooses the authoritative tick,
- all relevant parties advance from the same partition baseline,
- simulation only reads state that belongs to the partition or explicit IO boundaries.

## Partition tick-readiness barrier

The project needs a mechanism that verifies all relevant clients are ready to execute the same deterministic input on the same partition tick.

The barrier should be partition-local, not world-global.

Suggested flow:

1. A client sends a gameplay command.
2. The server validates it and assigns it to partition `P` and future tick `T`.
3. The server broadcasts a scheduled-command message for `P` and `T` to all relevant participants.
4. Each participant confirms it has the required baseline, prior commands, and content version for `P` through tick `T - 1`.
5. Each participant responds with a ready message for `P` and `T`.
6. When every required participant is ready, the server sends a commit or run message for `P` and `T`.
7. Every ready participant executes the same command set on tick `T`.
8. The server optionally requests or computes a hash for `P` at the configured interval.

If a participant is not ready in time:

- the server must not stall the whole world,
- the server may stall only that partition for mirrored clients if that policy is acceptable,
- or the server may continue authoritatively, mark the client out of sync, and force resync for that partition.

The important constraint is that the readiness barrier is scoped to the partition and to the participants who are actually expected to mirror it.

## Suggested message families

The exact wire format can change, but the logical families should stay stable.

### Client to server

```ts
type ClientIntentMessage = {
  type: "command:intent";
  id: string;
  name: string;
  payload: unknown;
  partitionId?: string;
};

type ClientReadyMessage = {
  type: "partition:ready";
  partitionId: string;
  tick: number;
  baselineVersion: number;
};

type ClientHashMessage = {
  type: "partition:hash";
  partitionId: string;
  tick: number;
  hash: string;
};

type ClientAckMessage = {
  type: "message:ack";
  id: string;
};
```

### Server to client

```ts
type ServerScheduledCommandMessage = {
  type: "partition:scheduled-command";
  partitionId: string;
  tick: number;
  command: {
    id: string;
    name: string;
    payload: unknown;
  };
};

type ServerCommitTickMessage = {
  type: "partition:commit-tick";
  partitionId: string;
  tick: number;
};

type ServerSnapshotMessage = {
  type: "snapshot";
  scope: "world" | "partition" | "actor-set";
  version: number;
  payload: unknown;
};

type ServerReplicationMessage = {
  type: "replication:update";
  scope: "actors";
  version: number;
  payload: unknown;
};

type ServerResyncMessage = {
  type: "partition:resync-required";
  partitionId: string;
  reason: "hash-mismatch" | "version-gap" | "not-ready";
};
```

These logical message families can still share one runtime adapter and one transport connection.

## What should use each path

### Shared command adapter only

Use for:

- player input,
- placement and deletion requests,
- interactions that mutate authoritative state,
- server-issued scheduled commands,
- readiness and resync control.

### Low-churn replication

Use for:

- player and NPC movement when deterministic mirrored simulation is unnecessary,
- actor presentation state that is cheap to correct,
- ownership and presence updates,
- other low-frequency authoritative changes.

### Deterministic partition simulation

Use for:

- belts,
- items on belts,
- production chains,
- claim-local automation,
- any simulation where per-tick raw replication would be too expensive or too semantically noisy.

## Why this split fits the repo

- It preserves the current MVP work instead of discarding it.
- It stops ECS diff replication from becoming the default answer to every multiplayer problem.
- It allows low-churn actor replication to remain simple.
- It creates a clear path toward deterministic client simulation without forcing whole-world lockstep.
- It matches the existing direction in [16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md](/workspaces/better-ecs/docs/architecture/16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md) and [17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md).

## Immediate implementation guidance

Current work should bias toward this shape now:

- keep the networking runtime centered on typed commands,
- keep snapshot and diff support for hydration and recovery,
- do not optimize whole-world ECS diff delivery as the final gameplay protocol,
- introduce replication policy boundaries so low-churn actors can replicate without dragging hot simulation into the same path,
- design the deterministic work around partition-local scheduled commands and readiness barriers from the beginning.