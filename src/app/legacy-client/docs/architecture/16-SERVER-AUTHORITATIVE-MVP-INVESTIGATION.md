# 16 - Server Authoritative MVP Investigation

## Goal

Finish the current authoritative MVP around one shared command networking adapter. The server owns gameplay simulation, the client becomes an input plus render adapter, and the first multiplayer slice proves that commands, hydration, and low-churn replication work against the real game scene.

This document intentionally keeps only the remaining work and the constraints that still matter. Completed setup steps have been removed. The follow-up deterministic partition simulation direction now lives in [17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md), and the concrete protocol split lives in [18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md](/workspaces/better-ecs/docs/architecture/18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md).

## Position in the stack

This MVP is not the final gameplay synchronization model.

- The shared command adapter is the durable foundation.
- Snapshot and diff transport remain valid for bootstrap, reconnect, and selected low-churn replicated state.
- High-churn simulation targets such as belts, carried items, and other factory-style systems should not treat raw ECS diffs as the long-term gameplay protocol.
- Deterministic partition simulation comes later, after authority boundaries and hydration rules are proven.

## Current state

Already in place:

- authoritative and local presentation responsibilities are split,
- typed gameplay commands exist in the shared commands library,
- the test harness and camera assertions exist,
- Bun server scaffolding exists behind one dev entry point,
- snapshot-plus-diff networking exists in a demo path,
- local-only presentation helpers remain outside authority.

Remaining work is the migration from demo networking to the actual world scene, with the command adapter treated as the primary interface and diff replication treated as a narrow support mechanism instead of the long-term game protocol.

## Remaining implementation work

### 1. Promote one shared command networking adapter to the center of the MVP

Current status:

- Partially in place. Typed client commands already exist, but the architecture still reads as if snapshot-plus-diff is the main networking story.

What remains:

- make the command adapter the explicit base layer for client-to-server and server-to-client gameplay messages,
- ensure gameplay features integrate through typed commands instead of direct client-side authoritative mutation,
- keep the transport neutral so low-churn replication and later deterministic simulation can both sit on top of the same command lane,
- avoid binding gameplay semantics to raw ECS diff messages.

### 2. Move the actual world simulation onto the server runtime

Current status:

- In progress. The server boots a headless authoritative engine and networking runtime, but the real game scene is not yet running there as the source of truth.

What remains:

- boot the actual world scene in the server runtime instead of the network demo scene,
- move authoritative world systems fully onto the server path,
- keep server boot free of DOM, canvas, and browser-only assumptions,
- ensure the client no longer mutates authoritative components directly.

### 3. Finish hydration and low-churn replication on top of the shared adapter

Current status:

- In progress. The networking adapter already versions snapshots and diff batches, but the real client scene is not yet using the same baseline-first hydration flow.

What remains:

- queue live updates while snapshot hydration is still running,
- apply the snapshot first,
- replay queued updates in order,
- fail fast on impossible ordering or version drift,
- switch the actual client world scene over to this flow,
- treat outgoing diffs as appropriate for bootstrap, reconnect, and low-churn actor replication rather than as the permanent synchronization path for hot simulation.

### 4. Preserve a strict single-client authority milestone

Before adding real multiplayer behavior, the server-owned single-client loop must preserve current gameplay for:

- movement,
- placement,
- deletion,
- conveyor behavior,
- world loading.

Constraints:

- no prediction or interpolation yet,
- correctness matters more than feel,
- slight lag is acceptable at this stage.

### 5. Keep the first pass scoped narrowly

The first authoritative pass should still target the overworld or similarly narrow scope.

Constraints:

- do not force full spatial-context support into the first milestone,
- keep context-specific setup easy to disable,
- restore wider context behavior only after the main authoritative loop is proven.

### 6. Add minimal multiplayer on top of proven single-client authority

Once single-client authority is stable, add the smallest shared-state multiplayer slice:

- username-only login,
- duplicate active username rejection,
- spawn or reconnect per accepted user,
- shared authoritative state visible across clients.

This is a proof phase, not a production account system.

### 7. Separate low-churn replicated actors from deterministic simulation targets

The MVP should explicitly split two networking categories:

- low-churn replicated actors such as players, NPCs, and similar presentation-facing entities may continue to use authoritative replication,
- deterministic simulation targets such as belts, carried items, and claim-local automation should not depend on raw ECS replication as their final synchronization model.

The purpose of the MVP is to prove the authority boundary and the shared command transport, not to lock the project into whole-world ECS diff streaming.

### 8. Separate local-player and external-player behavior cleanly

The code and tests must make this ownership split explicit:

- local player owns input capture and camera follow,
- external players render authoritative replicated state only,
- external players must never affect the local camera.

### 9. Verify shared actions across clients

After multiplayer is live, verify at least:

- movement,
- placement,
- deletion,
- conveyor outcomes.

One client acts, another observes the same committed result, and the authoritative state remains the only source of conflict resolution.

### 10. Keep replication layered over engine primitives

Networking should stay a consumer of engine serialization and diff infrastructure rather than becoming hard-coded gameplay logic.

Constraints:

- respect replication policy boundaries,
- keep local-only state out of outgoing updates,
- leave room for persistence, low-churn replication, and deterministic simulation to coexist later.

## Required verification

The MVP is not done without stable verification.

Required coverage:

- typed command flow through the shared adapter,
- snapshot hydration and update sequencing,
- single-client authority parity,
- duplicate username rejection,
- local-player camera ownership,
- external-player rendering from authoritative state,
- shared multiplayer actions,
- harness-level checks for placement and camera rules.

Browser checks should confirm the same behavior the harness asserts. Screenshots can support verification, but they should not be the only proof.

## Non-goals for this document

Do not expand this MVP with:

- deterministic mirrored client simulation,
- partition-ready barriers,
- rollback,
- prediction,
- interpolation polish,
- lag compensation,
- production authentication,
- relevance culling,
- binary transport optimization,
- full multi-context replication,
- whole-world ECS diff streaming as the final gameplay model.

Those belong to later documents, especially [17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md) and [18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md](/workspaces/better-ecs/docs/architecture/18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md).

## Delivery criteria

The MVP is complete when all of the following are true:

- one top-level `bun dev` starts the stack,
- the client connects through the same-origin Vite proxy,
- the Bun server runs the actual authoritative gameplay simulation,
- the shared command adapter is the primary gameplay transport boundary,
- single-client parity is preserved,
- duplicate active usernames are rejected,
- low-churn external actors replicate correctly,
- the harness and browser verification confirm placement, camera ownership, and replicated multiplayer state.