# 16 - Server Authoritative MVP Investigation

## Goal

Finish the current authoritative MVP path: the server owns gameplay simulation, the client becomes an input plus render adapter, and the feature set is proven first with single-client parity and then with minimal multiplayer verification.

This document intentionally keeps only the remaining work and the constraints that still matter. Completed setup steps have been removed. The follow-up deterministic mirrored-simulation direction now lives in [17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md).

## Current state

Already in place:

- authoritative and local presentation responsibilities are split,
- typed gameplay commands exist in the shared commands library,
- the test harness and camera assertions exist,
- Bun server scaffolding exists behind one dev entry point,
- snapshot-plus-diff networking exists in a demo path,
- local-only presentation helpers remain outside authority.

Remaining work is the actual migration from demo networking to the real world scene and the verification required to call the MVP done.

## Remaining implementation work

### 1. Move the actual world simulation onto the server runtime

Current status:

- In progress. The server boots a headless authoritative engine and networking runtime, but the real game scene is not yet running there as the source of truth.

What remains:

- boot the actual world scene in the server runtime instead of the network demo scene,
- move authoritative world systems fully onto the server path,
- keep server boot free of DOM, canvas, and browser-only assumptions,
- ensure the client no longer mutates authoritative components directly.

### 2. Finish client hydration from snapshot plus live diffs

Current status:

- In progress. The networking adapter already versions snapshots and diff batches, but the real client scene is not yet using the same baseline-first hydration flow.

What remains:

- queue live diffs while snapshot hydration is still running,
- apply the snapshot first,
- replay queued diffs in order,
- fail fast on impossible ordering or version drift,
- switch the actual client world scene over to this flow.

### 3. Preserve a strict single-client authority milestone

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

### 4. Keep the first pass scoped narrowly

The first authoritative pass should still target the overworld or similarly narrow scope.

Constraints:

- do not force full spatial-context support into the first milestone,
- keep context-specific setup easy to disable,
- restore wider context behavior only after the main authoritative loop is proven.

### 5. Add minimal multiplayer on top of proven single-client authority

Once single-client authority is stable, add the smallest shared-state multiplayer slice:

- username-only login,
- duplicate active username rejection,
- spawn or reconnect per accepted user,
- shared authoritative state visible across clients.

This is a proof phase, not a production account system.

### 6. Separate local-player and external-player behavior cleanly

The code and tests must make this ownership split explicit:

- local player owns input capture and camera follow,
- external players render authoritative replicated state only,
- external players must never affect the local camera.

### 7. Verify shared actions across clients

After multiplayer is live, verify at least:

- movement,
- placement,
- deletion,
- conveyor outcomes.

One client acts, another observes the same committed result, and the authoritative state remains the only source of conflict resolution.

### 8. Keep replication layered over engine primitives

Networking should stay a consumer of engine serialization and diff infrastructure rather than becoming hard-coded gameplay logic.

Constraints:

- respect replication policy boundaries,
- keep local-only state out of outgoing updates,
- leave room for persistence and replication to coexist later.

## Required verification

The MVP is not done without stable verification.

Required coverage:

- snapshot hydration and diff sequencing,
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
- rollback,
- prediction,
- interpolation polish,
- lag compensation,
- production authentication,
- relevance culling,
- binary transport optimization,
- full multi-context replication.

Those belong to later documents, especially [17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md).

## Delivery criteria

The MVP is complete when all of the following are true:

- one top-level `bun dev` starts the stack,
- the client connects through the same-origin Vite proxy,
- the Bun server runs the actual authoritative gameplay simulation,
- single-client parity is preserved,
- duplicate active usernames are rejected,
- external players replicate correctly,
- the harness and browser verification confirm placement, camera ownership, and replicated multiplayer state.