---
name: transport-belts
description: MUST be used whenever working with transport belt code, including spawners, systems, tests, placement, topology, and carried-item behavior.
---

# Transport Belts

## Purpose

Provide the high-level structural guidance and core mental model for transport belt work in the client app.

## When to use

- Modifying transport belt spawning, placement, or removal.
- Updating carried-item motion, topology, or belt traversal systems.
- Writing or updating transport belt tests, helpers, or constants.

## Key guidance

- Keep transport belt components data-only; place slot transfer, topology, and animation logic in focused utilities and systems.
- Keep transport belt systems declarative at the entrypoint and move mutation details into neighboring helpers.
- Prefer CPU-driven straight-belt behavior first for early item-motion work; add curves, connection ordering, or shader work only when the task explicitly requires them.
- Compute belt topology at spawn/remove time, not inside per-frame transport belt systems.
- Preserve physical gaps: removing a belt should break a line into separate chains rather than auto-splicing neighbors together.
- When restructuring transport belt utilities, colocate each utility with its own focused tests.
