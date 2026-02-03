# Feature: Render Thread + OffscreenCanvas

## Purpose

Define an engine-friendly architecture for running rendering on a dedicated worker using `OffscreenCanvas`, while keeping simulation and ECS updates on the main thread.

This document focuses on:
- Frame pacing and avoiding stutter (backpressure / “latest-wins”).
- Data transport strategy (postMessage vs SharedArrayBuffer).
- A Better ECS-aligned API that stays minimal and system-driven.
- Open-world scaling constraints (streaming, culling, large entity counts).

---

## Non-Goals (For The First Iterations)

- Full WebGPU backend (keep WebGL2 as the “real” backend, Canvas2D as debug).
- Perfect determinism between update/render threads (render is allowed to be “eventually consistent”).
- A full render graph / SRP equivalent. We can grow into a render graph later.

---

## Glossary

- **Update thread**: main thread ECS update loop (authoritative simulation).
- **Render thread**: worker that owns an `OffscreenCanvas` and does GPU submission + draw.
- **Extract**: main thread step that reads ECS state and writes render-ready data into a frame.
- **Frame**: the render snapshot (camera + instance data + resource references) consumed by the render thread.
- **Prepare/Queue**: optional steps to sort, batch, and map render data to GPU-friendly layouts.
- **Commit**: issue draw calls (WebGL2/WebGPU/Canvas2D).
- **Backpressure**: mechanism to prevent render frames from piling up in a queue.

---

## Web Platform Constraints (Important)

### SharedArrayBuffer requires cross-origin isolation

To enable `SharedArrayBuffer` you must serve with:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- Usually also `Cross-Origin-Resource-Policy: same-origin`

This affects:
- External assets (fonts/images) must be served in a COEP-compatible way.
- Any third-party CDN resources can break isolation unless they send the right headers.

### OffscreenCanvas support

OffscreenCanvas in workers is supported broadly in Chromium-based browsers. Some platforms have limitations:
- WebGL2 support in worker is generally good in Chromium; verify targets.
- Canvas2D in worker is also supported, but performance is not comparable to WebGL instancing.

---

## Core Architecture (Recommended)

### High-level principle: “latest-wins”

Never allow the render thread to build a backlog of frames.

If the update thread produces frames faster than the render thread can render them:
- The render thread should skip stale frames.
- The system should converge to: “always render the newest snapshot available”.

This is the key difference between “120fps counters but 5fps visuals” vs “smooth”.

### Render pipeline split

**Main thread**
1. ECS update tick mutates state (fixed UPS).
2. Render-phase extract builds a render snapshot for the current interpolation alpha.
3. Snapshot is published to the render backend (ideally shared buffers).

**Render worker**
1. Render loop reads the latest published snapshot.
2. Sort/batch if needed (or do it in extract if cheaper).
3. Submit GPU draw calls.

---

## Data Model: Commands vs Snapshots

### Recommendation: Snapshots (typed arrays, SoA)

For large counts (10k–50k), object command buffers are expensive due to:
- GC pressure
- structured cloning overhead
- per-frame allocation and parsing

Prefer a stable binary representation:

**Example (2D sprites/shapes)**
- `positions: Float32Array` (x, y)
- `rotation: Float32Array` (radians)
- `scale: Float32Array` (sx, sy)
- `color: Uint32Array` or `Uint8Array` (packed RGBA)
- `spriteIndex: Uint32Array` (atlas index / texture handle)
- `sortKey: Uint32Array` (layer | material | z)

This fits:
- WebGL instanced rendering (one draw call per material/texture group).
- Differential updates later (dirty ranges).

### When commands still make sense

Commands are useful for:
- Debug overlays
- Rare / low-count UI-style primitives
- “immediate mode” tooling

In those cases, commands should still be binary (typed arrays) when possible.

---

## Transport Options

### 1) postMessage (structured clone)
- Simplest
- Often too slow at scale
- Adds GC churn on both ends

### 2) postMessage (transfer ArrayBuffers)
- Good mid-point
- Still allocates a new buffer per frame unless you pool
- Still can queue frames and introduce stutter unless you add backpressure

### 3) SharedArrayBuffer + triple buffer (Recommended)
- Lowest overhead per frame
- No per-frame allocations
- Enables “latest-wins” naturally (read latest `seq`)
- Requires cross-origin isolation

---

## Buffering: Triple Buffer + Atomic Sequence (Recommended)

### Layout

Allocate `N` buffers (usually 3):
- Buffer 0..N-1 each containing fixed-capacity typed arrays.
- A shared header containing:
  - `writeSeq` (monotonic counter)
  - `lastCompleteSeq` (optional)
  - capacity and counts

### Publish (main thread)

Pseudo:
```ts
// choose a buffer slot
const seq = Atomics.add(header, WRITE_SEQ, 1) + 1;
const slot = seq % N;

// write frame data into slot arrays
writeFrame(buffers[slot], world, alpha);

// publish the new sequence (already implied by increment)
Atomics.store(header, PUBLISHED_SEQ, seq);
Atomics.notify(header, PUBLISHED_SEQ);
```

### Consume (render worker)

Pseudo:
```ts
const seq = Atomics.load(header, PUBLISHED_SEQ);
const slot = seq % N;
render(buffers[slot]);
```

### Backpressure policy

“Latest-wins” means:
- The worker renders `PUBLISHED_SEQ` when it can.
- It does not attempt to render every intermediate seq.

Optional: if you need deterministic capture/replay for tooling, add a bounded queue mode later.

---

## Better ECS API Proposal

### Guiding principles
- Keep engine minimal.
- Systems define behavior.
- Rendering should be “data in, pixels out”.
- Worker rendering should not require ECS access.

### Engine types (suggested)

#### `RenderBackend`

Main-thread handle responsible for:
- Initialization (canvas, worker, renderer backend)
- Allocating/publishing frames
- Resizing
- Resource messages (textures, meshes)

Sketch:
```ts
export type RenderBackend = {
  resize(width: number, height: number, dpr: number): void;

  beginFrame(): RenderFrameWriter;
  endFrame(frame: RenderFrameWriter): void; // publishes

  getStats(): RenderBackendStats; // queue delay, dropped, etc
  destroy(): void;
};
```

#### `RenderFrameWriter`

Write-only view into the current frame’s buffers:
```ts
export type RenderFrameWriter = {
  setCamera(camera: CameraSnapshot): void;

  // per-instance data (SoA)
  count: number;
  positions: Float32Array; // length = capacity * 2
  sizes: Float32Array;     // length = capacity * 2
  colors: Uint32Array;     // length = capacity
  sortKeys: Uint32Array;   // length = capacity

  // utilities
  setInstance(i: number, data: Instance2D): void;
};
```

#### `createRenderThreadBackend(...)`

```ts
export function createRenderThreadBackend(opts: {
  canvas: HTMLCanvasElement;
  workerUrl: URL;
  buffering: "triple" | "double";
  transport: "shared" | "transfer";
  renderer: "webgl2" | "canvas2d";
  capacity: number;
}): RenderBackend;
```

### System integration (Better ECS style)

Userland system (extract phase):
```ts
const RenderExtract = createSystem("render:extract")({
  phase: "render",
  system: () => {
    const world = useWorld();
    const engine = useEngine();

    const alpha = engine.frame.updateProgress;
    const frame = backend.beginFrame();

    // write camera + instances
    extractCamera(world, frame, alpha);
    extractSprites(world, frame, alpha);

    backend.endFrame(frame);
  },
});
```

Worker runtime (commit phase):
```ts
createRenderWorkerRuntime({
  canvas: offscreen,
  renderer: createWebGL2InstancedRenderer(),
  buffers,
  header,
});
```

This keeps rendering “in systems”, but splits data extraction from draw.

---

## Open World Considerations (50k Visible Entities)

To keep render extraction + GPU submission stable:
- **Visibility/culling must happen before writing instances.**
- **Streaming must not cause per-frame churn** (avoid reallocating instance arrays).

Recommended features:
- A render-visible set per camera (chunked spatial index).
- Stable render instance slots with a free list (so removal doesn’t reshuffle).
- Per-material batching (texture/mesh/material IDs drive sort keys).
- Optional LOD and impostors later.

---

## Instrumentation (Non-Negotiable)

The engine + backend should measure:
- Update tick time (simulation)
- Extract/build time (main thread)
- Encode/copy time (main thread transport)
- Queue delay / staleness (how old the snapshot is when drawn)
- Worker render time (CPU) and optional GPU time

### Engine Metrics Utility (Required)

To make these measurements *usable* (and to avoid one-off ad-hoc `performance.now()` calls everywhere), the engine should grow a small, allocation-free metrics facility that can be used in systems and then rendered as HUD/graphs.

**Goal:** collect per-frame metrics and maintain rolling aggregates (mean/median/p95) over a window so you can compare architectures honestly.

Suggested shape:
- `FrameMetrics` / `MetricsRegistry` living in engine core.
- Timers:
  - `timer.start("render:extract")` / `timer.end("render:extract")`
  - or RAII-style helper: `withTimer("render:extract", () => { ... })`
- Counters:
  - `counter.add("render:droppedFrames", 1)`
  - `counter.set("render:visibleCount", n)`
- Ring buffers:
  - fixed-size (e.g. last 120 or 600 frames) to avoid unbounded memory growth.
  - expose rolling aggregates for UI and summaries.
- Export:
  - make it easy for userland to subscribe/pull metrics at end-of-frame (e.g. `engine.metrics.snapshot()`).

**Important:** treat “frames sent” and “frames presented” as different metrics. For render threading, always measure the *consumed/committed* rate (worker ack / present), plus queue delay/staleness.

Acceptance tests should be defined in terms of:
- staleness under a threshold (e.g. < 1 frame on average)
- visible smoothness
- sustained FPS/UPS under load

---

## Step-by-Step Implementation Plan (1–2 Hour Chunks)

The goal is to keep each step independently shippable with a clear “done” signal.

### Step 1: Make Metrics Honest
- Goal: “FPS/UPS” reflect *presented* frames and real update ticks.
- Work:
  - Count worker acks as “presented frames”.
  - Track update ticks in the update system (not via yielded `update.shouldUpdate`).
- Done when:
  - At 120/120, FPS drops if the worker can’t keep up.
  - Queue delay increases when overloaded.

### Step 2: Add Backpressure (“Latest Wins”) In The POC
- Goal: eliminate stutter caused by frame queues.
- Work:
  - Render worker always renders newest available frame.
  - Drop intermediate frames (no queue growth).
- Done when:
  - Visual stutter decreases dramatically under overload.
  - Queue delay stays bounded.

### Step 3: Remove Per-Frame Allocations In Hot Paths
- Goal: stop GC-driven stutter.
- Work:
  - No per-frame `string[]` fill styles.
  - No per-frame `RenderCommand` object arrays.
- Done when:
  - Long runs show stable frame pacing (no multi-second spikes).

### Step 4: Switch The Worker Renderer To WebGL2 Instancing (POC)
- Goal: render 10k–50k instances without Canvas2D limits.
- Work:
  - Implement a basic instanced quad pipeline (or points first).
  - Use typed arrays for instance data.
- Done when:
  - 10k at 60/60 is smooth.
  - 50k remains interactive (even if not perfect).

### Step 5: Introduce `RenderBackend` (Engine)
- Goal: formalize “submit a frame” as an engine concept.
- Work:
  - Add `RenderBackend` interface in `packages/engine`.
  - Add a main-thread backend implementation (simple).
- Done when:
  - A client render system uses `backend.beginFrame()/endFrame()`.

### Step 6: Add `RenderFrameWriter` SoA Layout (Engine)
- Goal: standardize a render snapshot shape.
- Work:
  - Define `RenderFrameWriter` for 2D instances.
  - Start with fixed capacity (user-provided).
- Done when:
  - Frame extraction fills SoA arrays and renders via a backend.

### Step 7: Render Thread Backend (Transfer Mode)
- Goal: worker rendering works without SAB.
- Work:
  - PostMessage transfer a pooled set of ArrayBuffers.
  - Implement “latest-wins” policy even in transfer mode.
- Done when:
  - Worker rendering is smooth at moderate loads.

### Step 8: Render Thread Backend (SharedArrayBuffer Triple Buffer)
- Goal: minimal per-frame overhead.
- Work:
  - Shared header + triple buffers.
  - Atomics-based publication + consumption.
- Done when:
  - Queue delay remains low under load.
  - No per-frame allocations.

### Step 9: Resource Protocol (Textures) v1
- Goal: stable texture handles across threads.
- Work:
  - Define `TextureId` and messages: `createTexture`, `destroyTexture`.
  - Main thread loads/decodes images; transfers `ImageBitmap` to worker.
- Done when:
  - Sprites render with real textures in worker.

### Step 10: Sorting + Batching As Data (No JS object sorting)
- Goal: stable ordering without allocations.
- Work:
  - Generate a `sortKey` per instance.
  - Optionally sort indices or do GPU-friendly ordering by grouping.
- Done when:
  - Layers/material groups render correctly.

### Step 11: Render-Visible Set + Culling Hook
- Goal: avoid writing 50k instances when only 8k are visible.
- Work:
  - Add a `visibleQuery(camera)` helper or a spatial index plugin.
  - Extract only visible entities.
- Done when:
  - Visible count changes with camera movement.
  - Performance scales with visible count.

### Step 12: Engine-Level “Render Extract” Helpers
- Goal: make userland extraction systems ergonomic.
- Work:
  - Provide helpers: `extractCamera`, `extractSprites`, `packColor`, etc.
- Done when:
  - A user scene can implement a worker renderer with minimal boilerplate.

### Step 13: Move The Existing Client Render System To The New API
- Goal: migrate real app rendering.
- Work:
  - Replace the object-command pipeline with extract + backend.
  - Remove legacy pipeline usage (No Legacy Code Policy).
- Done when:
  - Client renders using backend + worker.

### Step 14: Production Pacing Defaults
- Goal: choose sane defaults for shipping.
- Work:
  - UPS fixed (e.g. 30/60), FPS target based on device refresh.
  - Cap render to display refresh; decouple from update.
- Done when:
  - Visual pacing is stable across 60/120Hz displays.

---

## Suggested Reading (Engines + Rendering)

### Engine/render architecture concepts
- “Real-Time Rendering (4th edition)” (foundational GPU pipeline book).
- “Game Programming Patterns” (architecture patterns in games).
- “Data-Oriented Design” (why SoA/packing matters for performance).
- Search: “Frame graph rendering architecture” (modern render graph approaches).

### ECS + rendering splits
- Bevy render architecture (Extract / Prepare / Queue / Render).
- Unity Scriptable Render Pipeline (SRP) concepts.
- Unity Entities Graphics / DOTS rendering (ECS-oriented instancing).

### Classic engine render threading
- Unreal Engine render thread + RHI thread concepts.
- Unreal “Render Dependency Graph (RDG)” (modern render-graph style).
- Godot RenderingServer and threaded rendering notes.

### Web platform specifics
- MDN: OffscreenCanvas
- MDN: SharedArrayBuffer + cross-origin isolation (COOP/COEP)
- WebGL2 instancing (`drawArraysInstanced`, `vertexAttribDivisor`)
