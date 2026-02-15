# Placement

Purpose
- Place selected items into the world as entities at snapped grid coordinates.

Initial constraints
- Placement only (delete/rotate can follow later).
- Entity creation on successful placement.
- Validate against integer-grid footprint rules.

Planned artifacts
- Placement input system (mouse click)
- Placement validation (`canPlaceAt`)
- Spawn helper per selected item type
- Optional ghost/preview entity
