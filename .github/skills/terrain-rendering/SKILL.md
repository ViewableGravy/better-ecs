---
name: terrain-rendering
description: Application-level guidance for chunked terrain data and extensible tile presentation in Better ECS.
---

# Terrain Rendering

## Purpose

Keep terrain simulation data, chunk ownership, and tile presentation aligned while allowing the visual layer to grow beyond a simple base tile surface.

## When to use

- Adding or modifying chunked terrain storage or tile coordinate mapping.
- Changing terrain generation, terrain mutation, or dirty-chunk invalidation.
- Extending tile visuals with textures, foliage, props, or other assets.

## Behavior

1. Support negative tile coordinates. Map tile coordinates to chunks with mathematical floor division; a tile belongs to the chunk containing its floored coordinate, including when the coordinate is negative.
2. Keep authoritative terrain data separate from rendering caches. Mark the owning chunk dirty when a tile changes, and add neighboring invalidation only when a visual dependency actually crosses chunk boundaries.
3. Do not return early from a terrain update system unless it performs real lifecycle or simulation work. If the engine requires a system entrypoint but terrain has no per-frame update, use the smallest explicit no-op accepted by the system API.
4. Treat a custom shader as one presentation layer, not the entire tile architecture. Use instanced attributes or texture/material IDs for tile variation, and add dedicated render passes or buckets for foliage, props, and other assets as those features grow.
5. Keep tile rendering read-only with respect to authoritative terrain state; rebuild transient GPU data from dirty terrain chunks in the render layer.
