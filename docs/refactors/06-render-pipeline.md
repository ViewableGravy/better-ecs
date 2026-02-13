# Improvements to the Render Pipeline

## User Request

> 6. RenderVisibleWorlds
>    It feels like we have removed the "queue" aspect in the render pipeline and just moved to a single function which is not ideal. Practically speaking, we might need some changes.
> 1. We need some way to define on the renderer, what it should do before and at the end of each render pass. This way we can define things like clear, begin, end, as standard per frame behaviour. This may not be necessary in webgl (unsure) but for canvas2d this makes sense at least
> 1. The loop over worlds feels weird. We need some way to be able to effectively just say that systems should run for each active world / visible world. But it's awkward at the moment because the context system is not known in the pipeline, and so we are doing some weird conditionals to get the worlds to iterate over. Consider how we can tackle this more elegantly using some algorithm or design pattern
> 1. steps inside the loop should be able to be attached to the render pipeline as pipeline steps, rather than being inside the loop directly. Each phase of the pipeline does not know about previous steps, and this should therefore be possible

## Current Implementation

The rendering logic is centralized in [apps/client/src/systems/render/stages/RenderVisibleWorlds.ts](apps/client/src/systems/render/stages/RenderVisibleWorlds.ts):

```typescript
export function RenderVisibleWorldsStage(): void {
  // ...
  renderer.high.begin();
  renderer.high.clear(CLEAR_COLOR);

  for (const world of worlds) {
    queue.clear();
    collectRenderables(world, queue);
    sortRenderQueue(world, queue);
    commitWorld(world, renderer, queue, alpha);
  }

  renderer.high.end();
}
```

The pipeline itself is defined in [apps/client/src/systems/render/index.ts](apps/client/src/systems/render/index.ts) but currently only has this one stage.

## Proposed Changes

1. **Renderer Hooks**: Add `onBeginPass()` and `onEndPass()` methods to the `IRenderer` interface. Move `clear`, `begin`, and `end` logic there.
2. **Context-Aware Pipeline**: Instead of manual world iteration in one stage, the `RenderPipeline` should be aware of multiple worlds.
3. **Pipeline Stages for World Iteration**:
   - `CollectionStage(world)`
   - `SortingStage(world)`
   - `CommitStage(world)`
     The pipeline runner should handle the loop: `for (world of visibleWorlds) { runStages(world); }`.
4. **Decouple Spatial Context**: Introduce a `WorldProvider` abstraction so the render pipeline doesn't need to know about `SpatialContextManager` specifically.

## Benefits

- **Granularity**: Stages like `Collect`, `Sort`, and `Commit` become independent and swappable.
- **Maintainability**: Removes conditional logic from the main render tick.
- **Portability**: The same pipeline logic can handle single-world and multi-world scenarios identically.
