# Appendix: Rejected Alternatives

## Rejected 1: World Subclasses (Engine Core)
*Idea:* `class PartitionedWorld extends World`.
*Reason:* Locks the engine into specific streaming logic. Better to keep World minimal and use external managers.

## Rejected 2: Component-Based Partitioning
*Idea:* `SpatialPartition` component.
*Reason:* Requires loading ALL entities into memory to query them, defeating the purpose of streaming.

## Rejected 3: Global Partition Manager
*Idea:* User manually registers `PartitionManager`.
*Reason:* DX friction. Users shouldn't need to manually wire up internal mechanics of a specific world type.
