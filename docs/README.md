# Docs Index

This folder should stay focused on active work and durable reference material.

## Current execution path

- [architecture/16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md](/workspaces/better-ecs/docs/architecture/16-SERVER-AUTHORITATIVE-MVP-INVESTIGATION.md)
  - Current implementation target for finishing the authoritative MVP around a shared command transport, hydration, and low-churn replication.
- [architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md](/workspaces/better-ecs/docs/architecture/17-DETERMINISTIC-PARTITIONED-SIMULATION-ROADMAP.md)
  - Planned follow-up after the authoritative MVP: deterministic partition simulation, readiness barriers, worker execution, and resync rules.
- [architecture/18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md](/workspaces/better-ecs/docs/architecture/18-HYBRID-COMMAND-NETWORKING-PROTOCOL.md)
  - Concrete protocol split: one command adapter, selective low-churn replication, deterministic partition scheduling, and resync control.
- [NETWORK_DIRTY_TRACKING_IMPLEMENTATION_STATUS.md](/workspaces/better-ecs/docs/NETWORK_DIRTY_TRACKING_IMPLEMENTATION_STATUS.md)
  - Status tracker for engine diff and dirty-tracking work that networking depends on.
- [RENDERING_50K_120FPS_ROADMAP.md](/workspaces/better-ecs/docs/RENDERING_50K_120FPS_ROADMAP.md)
  - Active rendering performance roadmap and progress log.

## Active reference material

- [architecture/README.md](/workspaces/better-ecs/docs/architecture/README.md)
  - Spatial-contexts and related architecture references that are still useful, but are not the current primary execution path.
- [ASSET_MANAGEMENT.md](/workspaces/better-ecs/docs/ASSET_MANAGEMENT.md)
  - Asset-management design reference.
- [SCENE_SYSTEMS.md](/workspaces/better-ecs/docs/SCENE_SYSTEMS.md)
  - Short API reference for scene-scoped systems.
- [conveyor-system-design.md](/workspaces/better-ecs/docs/conveyor-system-design.md)
  - Conveyor design notes and constraints reference.
- [WEBGL_CIRCLE_FRAGMENT_SHADER_PLAN.md](/workspaces/better-ecs/docs/WEBGL_CIRCLE_FRAGMENT_SHADER_PLAN.md)
  - Targeted shader work plan.
- [RENDERING_1M_ENTITY_AUDIT.md](/workspaces/better-ecs/docs/RENDERING_1M_ENTITY_AUDIT.md)
  - Large-scale rendering audit reference.

## Archive policy

Completed scratch plans, temporary status summaries, redirect files, and superseded investigations should be removed rather than kept beside active work. If a finished document still contains durable guidance, fold the relevant parts into the surviving reference document instead of keeping both.