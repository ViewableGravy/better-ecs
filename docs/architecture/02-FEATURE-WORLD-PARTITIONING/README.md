# Feature: World Partitioning & Streaming

## Overview

This feature folder documents the architectural decisions and implementation plans for open-world entity streaming, spatial partitioning, and schema evolution in the Better ECS engine.

Following investigation, we have selected the **World Factory & Streaming Contract** pattern.

- **Partitioning**: Implemented via a **Plugin**, not engine core inheritance. (See `02-FEATURE-SPATIAL-CONTEXTS-PLUGIN.md`)
- **World Interface**: Partitioned worlds strictly implement the synchronous `UserWorld` interface.
- **Streaming**: Decoupled IO (Background) and Entity Hydration (Sync Frame).
- **System Injection**: Scenes define their own systems (e.g., `PartitionManager`), injected dynamically.
- **Versioning**: Handled via component-defined history.

## Documents

1.  **[Streaming Contract](./01-STREAMING-CONTRACT.md)**
    - Defines the synchronous `UserWorld` interface requirement.
    - Specifies the Streaming Contract (Async Fetch -> Sync Hydration).
    - Outlines required engine primitives (Batch Operations, Event Suspension).

2.  **[System Scopes](./02-SYSTEM-SCOPES.md)**
    - Introduces the concept of "World Systems" (scoped to specific World instances).
    - Explains how `PartitionManager` is automatically injected via the World Factory pattern.
    - Differentiates Global, Scene, and World scopes.

3.  **[Schema Evolution](./03-SCHEMA-EVOLUTION.md)**
    - Details the Hybrid Strategy: Component-Defined History.
    - Explains why build-time only generation was insufficient (dynamic imports).
    - Defines the `@Serializable` decorator with versioning and migration hooks.
    - Describes the optimization workflow (squashing assets).

## Appendix: Rejected Alternatives

See [Rejected Alternatives](./04-REJECTED-ALTERNATIVES.md) for archival notes on approaches that were considered but discarded (e.g., World Subclasses, Component-Based Partitioning).
