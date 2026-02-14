# Render Passes + Frame Allocator (Design Primer)

## Why this document exists

This document explains, in practical terms, how to evolve the current Better ECS rendering approach into a pass-based render architecture with reusable per-frame memory.

It is intentionally beginner-friendly and focused on 2D needs.

---

## TL;DR

- The current client setup is effectively a **single render pass** (`begin -> clear -> collect/sort/commit -> end`).
- You can evolve this into **multi-pass rendering** without changing the engine’s core ECS mental model.
- Naming `FrameAllocator` is reasonable and often clearer than `FrameResources` when the purpose is memory lifecycle.
- In JavaScript/TypeScript, a frame allocator does **not** manually free memory; instead, it reuses preallocated buffers/pools and resets them each frame.
- This still gives major benefits: lower GC pressure, fewer frame spikes, clearer pass boundaries, better composability.

---

## Terminology (important)

### Render pipeline

A broad term for “the full rendering flow” from scene data to pixels.

### Render pass

A distinct step in that flow with a single purpose (examples: `visibility`, `opaque`, `transparent`, `ui`, `post`).

### Multi-pass rendering

Rendering that runs multiple passes in one frame. Passes may depend on previous pass outputs.

### Render graph (advanced)

A dependency graph of passes/resources with scheduling. Usually overkill at first for 2D, but a good eventual target.

### Frame allocator / frame arena

A per-frame memory manager. You request temporary memory-like data containers during the frame; they are reset/recycled at frame end.

---

## Is `FrameAllocator` a good name?

Yes. Recommended naming hierarchy:

- **`FrameAllocator`**: when emphasizing lifecycle and allocation/reuse API.
- **`FrameArena`**: common in native engines, implies bump/arena semantics.
- **`FrameResources`**: broader, softer name (can include non-memory resources too).

Suggested compromise:

- Keep class name: `FrameAllocator`
- Keep context field name: `frame` or `frameAllocator`

This balances clarity with explicit intent.

---

## How a Frame Allocator stores different data types

Your proposed direction is strong: prefer a **registry-based allocator** over adding one method per type (`rect()`, `vec2()`, etc.).

In TS/JS, avoid trying to emulate raw memory blocks too early. Start with **typed pools and scratch buffers** behind a generic `acquire(name, ...args)` API.

## Practical strategy

1. **Typed scratch arrays** for IDs and indices.
2. **Named object pools** for high-churn structs (`Vec2`, `Rect`, sorting keys, cull records).
3. **Optional typed arrays** (`Float32Array`, `Uint32Array`) for numeric hot paths.
4. **Frame reset** at end of frame (`reset()`), never during pass execution.

### Example registry-based API shape

```ts
type PoolFactory<T, TArgs extends readonly unknown[]> = {
  create(...args: TArgs): T;
  reset(instance: T, ...args: TArgs): void;
};

interface FrameAllocatorRegistry {
  rect: PoolFactory<
    MutableRect,
    readonly [left: number, top: number, width: number, height: number]
  >;
  vec2: PoolFactory<MutableVec2, readonly [x: number, y: number]>;
  // shapeAabb: PoolFactory<ShapeAabb, readonly [entityId: number]>;
}

interface FrameAllocator<R extends Record<string, PoolFactory<unknown, readonly unknown[]>>> {
  beginFrame(): void;
  endFrame(): void; // or reset()

  // scratch arrays (reused)
  entities(): number[];
  drawKeys(): number[];

  // generic pooled acquisition
  acquire<K extends keyof R>(
    name: K,
    ...args: R[K] extends PoolFactory<unknown, infer TArgs> ? TArgs : never
  ): R[K] extends PoolFactory<infer T, readonly unknown[]> ? T : never;

  // optional typed-array slices
  f32(count: number): Float32Array;
  u32(count: number): Uint32Array;
}
```

Usage:

```ts
const rect = frameAllocator.acquire("rect", left, top, width, height);
const point = frameAllocator.acquire("vec2", x, y);
```

This keeps the API stable as types grow. New pooled types are added through registry bindings, not new top-level allocator methods.

### Internal structure (recommended)

Yes, conceptually it is a map of named pools:

```ts
{
  rect: Pool<MutableRect, [number, number, number, number]>,
  vec2: Pool<MutableVec2, [number, number]>,
}
```

At runtime, the allocator is effectively:

- a set of reusable scratch buffers,
- plus a list/map of named pools,
- plus lifecycle hooks (`beginFrame` / `endFrame`) that rewind active indices.

### Important behavioral rule

Anything obtained from `FrameAllocator` is **frame-scoped only**. Never store references across frames.

---

## “Request by entity” idea

You mentioned requesting memory by entity. This is valid, but separate two use cases:

1. **Persistent entity state** (position/history/animation state):
   - belongs in ECS components or stable caches
   - not frame allocator data

2. **Temporary per-frame derived data** (screen rect, sort key, culling result):
   - belongs in frame allocator
   - can be keyed/indexed by entity during that frame only

A safe pattern:

- build temporary `entity -> index` map in frame allocator scratch structures
- consume it in subsequent passes
- drop/reset at frame end

If useful, define a pooled type that accepts `entityId` in `acquire(...)`, but keep the produced object frame-scoped.

---

## How this connects to multi-pass rendering

A clean flow for 2D:

1. **BeginFramePass**
   - begin renderer pass, clear targets
   - `frameAllocator.beginFrame()`

2. **WorldSelectionPass**
   - gather active/visible worlds from provider

3. **Visibility/CullingPass**
   - gather visible entities into scratch buffers

4. **SortPass**
   - build sort keys in scratch memory

5. **MainDrawPass**
   - render sprites/shapes/background

6. **OverlayPass**
   - UI/debug overlays/particles (or dedicated particle pass)

7. **EndFramePass**
   - submit/end renderer pass
   - `frameAllocator.endFrame()` (reset/reuse)

---

## Proposed engine integration (`createEngine({ render })`)

Your proposed shape is good and improves separation of concerns.

```ts
createEngine({
  systems: [
    /* simulation systems */
  ],
  render: renderPipeline,
});
```

### Why this helps

- Render orchestration becomes an explicit engine subsystem.
- Apps can compose their render architecture separately from gameplay systems.
- Enables future non-ECS or hybrid render sources without changing simulation systems.

### Recommended design boundary

- `systems`: simulation/update concerns
- `render`: frame orchestration and visual output concerns
- shared bridge: read-only world/query access + engine frame timing

---

## Temporary example architecture (conceptual TS)

```ts
type RenderPassContext = {
  engine: Engine;
  renderer: Renderer;
  worldProvider: WorldProvider;
  frameAllocator: FrameAllocator;
  alpha: number;
};

type RenderPass = {
  name: string;
  execute(ctx: RenderPassContext): void;
};

class RenderPipeline {
  constructor(private readonly passes: RenderPass[]) {}

  run(ctx: RenderPassContext): void {
    ctx.frameAllocator.beginFrame();
    try {
      for (const pass of this.passes) {
        pass.execute(ctx);
      }
    } finally {
      ctx.frameAllocator.endFrame();
    }
  }
}
```

Example pass list:

```ts
const renderPipeline = new RenderPipeline([
  BeginFramePass,
  SelectWorldsPass,
  CollectVisiblePass,
  SortDrawablesPass,
  DrawMainPass,
  DrawParticlesPass,
  DrawUiPass,
  EndFramePass,
]);
```

---

## Where this maps to current Better ECS code

Current single-stage behavior combines many responsibilities:

- pass lifecycle (`begin/clear/end`)
- world selection
- collect/sort/commit

This currently lives in one place in client render stages.

A first refactor can preserve current behavior while changing architecture:

1. Split current stage into explicit pass-like stages.
2. Add `WorldProvider` abstraction.
3. Add `FrameAllocator` to render context.
4. Keep existing drawing API (`renderer.high` / `renderer.low`) initially.

No visual behavior change required for first migration.

---

## Risks and mitigations

## 1) Stale frame references

Risk: Data from allocator is stored and used next frame.

Mitigation:

- Document frame-scoped contract.
- Optionally include dev assertions with a frame token/version.

## 2) Over-engineering too early

Risk: Complex allocator APIs before proving need.

Mitigation:

- Start with scratch arrays + a couple pools (`Vec2`, `Rect`, draw key).
- Add typed-array arenas only where profiling proves value.

## 3) Pass ordering complexity

Risk: Hidden dependencies between passes.

Mitigation:

- Require explicit input/output contracts per pass.
- Keep pass list linear first; defer graph scheduling.

## 4) Debugging difficulty

Risk: Reused objects make bugs harder to inspect.

Mitigation:

- Debug mode: clear/reset with sentinel values.
- Add optional validation pass.

---

## 2D-specific benefits (realistic)

- More stable frame time in scenes with many entities.
- Cleaner layering (world/background/actors/effects/UI).
- Easier culling and batching evolution.
- Better transition to camera stacks and post-like effects.

For simple 2D scenes, gains are mostly architectural and consistency-oriented rather than huge FPS jumps.

---

## Recommended phased plan

## Phase 1: Structural split (no allocator yet)

- Introduce pass abstractions.
- Move begin/end + world loop ownership to pipeline.
- Keep existing queue + commit logic.

## Phase 2: Add minimal `FrameAllocator`

- Add scratch arrays + object pool for temporary sort/cull records.
- Reset each frame in pipeline `finally`.

## Phase 3: Pass contracts and provider DI

- Add `WorldProvider` and pass context object.
- Remove render-stage knowledge of spatial context internals.

## Phase 4: Optional advanced optimizations

- Typed-array arenas for numeric-heavy temporary data.
- Optional render graph style dependencies.

---

## Suggested initial interfaces

```ts
interface WorldProvider {
  getVisibleWorlds(): readonly UserWorld[];
}

interface FrameAllocator {
  beginFrame(): void;
  endFrame(): void;
  entities(): number[];
  acquire(name: "rect", left: number, top: number, width: number, height: number): MutableRect;
  acquire(name: "vec2", x: number, y: number): MutableVec2;
}
```

These are intentionally minimal and enough to start, while still supporting scalable named pools.

---

## Final recommendation

Move toward **multi-pass pipeline + `FrameAllocator`** incrementally.

- Use `FrameAllocator` naming.
- Keep first implementation small and measurable.
- Treat render data as frame-scoped temp data, not persistent entity state.
- Keep current renderer backend APIs and migrate orchestration first.

This gives immediate architecture wins and sets up future performance wins with low migration risk.
