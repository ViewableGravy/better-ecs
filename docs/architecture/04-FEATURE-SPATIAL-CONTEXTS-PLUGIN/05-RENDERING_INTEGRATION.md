# Spatial Contexts — Rendering Integration (Existing Pipeline)

## Current state

Better ECS already has a render pipeline concept (render queue + pipeline stages).

Spatial contexts should integrate by providing:

- the ordered list of **visible worlds** for the current frame
- optional per-world render modifiers (opacity, filters, etc.)

## Rendering multiple worlds

A single render pipeline can render a stack of worlds by:

1. Clearing once.
2. For each visible world in order:
   - set camera (world-specific or shared)
   - build queue from that world
   - commit queue

Important: the engine pipeline stages currently assume one `useWorld()`.

Spatial contexts integration should:

- either run the render stages in a loop with a “current world binding”, or
- provide a pipeline stage that iterates worlds and calls lower-level render helpers.

(Exact mechanism is an implementation detail; the doc-level requirement is: render pipeline can draw N worlds.)

## House / dungeon policies

- House: render interior only, or render parent behind with dim/blur.
- Dungeon: render only dungeon.

These are policy-driven; spatial contexts should not hardcode the look.

## Acceptance criteria

- Rendering works with multiple visible worlds.
- Render ordering is deterministic.
- No new concept of “render systems” is introduced; we attach steps to the existing pipeline.
