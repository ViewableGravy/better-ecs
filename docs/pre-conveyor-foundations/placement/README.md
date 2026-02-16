# Placement

Purpose
- Place selected items into the world as entities at snapped grid coordinates.

Initial constraints
- Placement plus delete (right click) for initial POC.
- Entity creation on successful placement.
- Validate against integer-grid footprint rules.
- Block placement on collisions with existing colliding entities.
- Initial item is a `1x1` debug box with collider.
- Placement anchor is top-left.
- Ghost preview is required (reduced alpha).
- Rotation and direction are deferred.
- Placement range is unlimited.

Planned artifacts
- Placement input system (mouse click)
- Placement validation (`canPlaceAt`)
- Spawn helper per selected item type
- Ghost/preview entity
- Deletion system (right click)
