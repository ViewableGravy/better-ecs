# 18 - Hybrid Command Networking Protocol

## Goal

Define one networking foundation that can support both of the multiplayer models this project needs:

- authoritative low-churn replication for actors such as players and NPCs,
- deterministic partition simulation for factory-style systems such as belts, carried items, and other claim-local automation.

The shared base is a bidirectional command adapter that can send and receive typed messages. Replication and deterministic simulation are systems built on top of that adapter, not competing transports.

Application code should consume that foundation through an app-level network manager that binds engines or workers, routes messages into `realtime` and `simulation` lanes, and hides transport-level details such as correlation ids, tick metadata, readiness messages, and catch-up state.

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
- exchange authoritative tick and client progress metadata at the session or partition level,
- expose one adapter API to the rest of the game.

The adapter API should not care whether the caller is using low-churn replication or deterministic simulation.

### 1.5 App-level network manager layer

This layer wraps the shared adapter for one game or application runtime.

Responsibilities:

- register the current engine and later the simulation worker,
- expose separate ergonomic lanes for low-churn realtime traffic and deterministic simulation traffic,
- attach partition ids, intended tick metadata, and correlation ids where appropriate,
- track sync state per partition such as `hydrating`, `catching-up`, `live`, `desynced`, and `resyncing`,
- shield game features from transport parsing and low-level acknowledgement plumbing.

Illustrative shape:

```ts
const networkManager = createAppNetworkManager({
  targetLagTicks: 60,
  maxLagTicks: 120,
});

networkManager.registerEngine(engine);

networkManager.realtime.send({
  name: "movement:move",
  payload: { x: 1, y: 0 },
});

networkManager.simulation.send({
  partitionId: "demo:factory-1",
  name: "build:delete-entity",
  payload: { entityId: "belt-12" },
});
```

This manager belongs above the shared networking foundation, not inside the low-level transport runtime.

### 2. Shared command layer

This is the common language for all higher-level systems.

Message families:

- client intent commands,
- server acknowledgements or rejections,
- server scheduled commands,
- readiness and tick-control messages,
- progress and lag-window health messages,
- snapshot and resync control messages,
- optional low-churn replicated state messages.

At this level, a command is not limited to player input. It can also represent a server-issued instruction such as "apply this build command on tick 420" or "prepare partition P for tick 421".

The protocol should model authoritative ticks and mirrored progress explicitly, but it should not hard-code one exact client pacing policy. A target lag window such as 60 to 90 ticks is a better fit than demanding that every client always sits on exactly one offset.

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

This barrier is separate from general catch-up health. A client can be inside the target lag window for a partition and still fail readiness for a specific scheduled tick because it is missing a baseline, earlier commands, or compatible content.

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

Do not treat per-command acknowledgements as the main long-term health signal for deterministic mirroring. Prefer per-partition progress and readiness by tick range.

## Client sync policy over the protocol

The wire protocol should support a mirrored client that intentionally runs behind the server by a configurable lag window.

Recommended model:

- initial hydration may leave the client far behind the authoritative server tick,
- the client then enters a catch-up or "hyperdrive" phase where it advances simulation faster than normal and may suppress normal rendering,
- once local applied tick enters the lag window, the client switches to normal live mirrored execution,
- if the client falls too far behind, it re-enters catch-up,
- if the client gets too close to or ahead of the authoritative server tick, it slows or pauses mirrored advancement,
- if the client cannot regain a healthy window or misses required readiness deadlines, it becomes desynced and must resync.

This is a client policy layered on top of the protocol. The protocol's job is to expose the tick metadata, scheduled commands, readiness controls, and recovery messages needed to implement it.

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

type ClientProgressMessage = {
  type: "partition:progress";
  partitionId: string;
  appliedTick: number;
  baselineVersion: number;
  state: "hydrating" | "catching-up" | "live" | "desynced" | "resyncing";
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

type ServerPartitionStatusMessage = {
  type: "partition:status";
  partitionId: string;
  authoritativeTick: number;
  targetLagTicks: number;
  maxLagTicks: number;
};

type ServerSnapshotMessage = {
  type: "snapshot";
  scope: "world" | "partition" | "actor-set";
  version: number;
  authoritativeTick?: number;
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
- readiness, progress, and resync control.

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
- add the app-level network manager above the current adapter rather than bloating the low-level transport runtime with game-specific pacing policy,
- keep snapshot and diff support for hydration and recovery,
- include authoritative tick metadata in bootstrap and mirrored partition status messages,
- distinguish low-frequency partition progress reporting from strict tick readiness messages,
- do not optimize whole-world ECS diff delivery as the final gameplay protocol,
- introduce replication policy boundaries so low-churn actors can replicate without dragging hot simulation into the same path,
- design the deterministic work around partition-local scheduled commands and readiness barriers from the beginning.