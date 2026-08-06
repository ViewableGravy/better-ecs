---
name: rendering
description: Architecture and implementation guidance for Better ECS rendering, including render pipeline passes, typed pass context, and render-only presentation work.
---

# Rendering

## Purpose

Use the rendering pipeline to project current engine state onto the screen. Rendering is a read-only presentation layer: it may derive transient draw data, interpolation values, shader uniforms, and GPU commands, but it must not become a second update loop.

## When to use

- Adding or refactoring a render pass, debug overlay, or shader-backed visual.
- Deciding whether behavior belongs in an update system or the render pipeline.
- Connecting renderer services, frame allocators, queues, cameras, or render state to visual output.

## Core model

The render pipeline runs after the engine has produced the current authoritative state. A pipeline is composed from ordered passes. Each pass receives the active render context and may submit presentation work through the renderer or render queue.

Keep the boundary clear:

- Update systems own simulation, gameplay, physics, persistent timers, and world mutation.
- Render passes own presentation, interpolation, draw preparation, camera-relative calculations, and shader uniforms.
- A render pass may read registries, components, resources, and pipeline state.
- A render pass must not add, remove, create, destroy, or mutate ECS state.
- Values that must survive a frame, be saved, or affect simulation belong in update-owned state.
- Values that only describe this frame's appearance can be derived during rendering.

## Pipeline structure

A render pipeline normally has engine-owned lifecycle stages plus application-owned passes. Application render passes are self-contained feature folders under `render/passes/*`:

```text
render/
  index.ts
  passes/
    world.background/
      utilities/
        index.ts
      shaders/
        background.vert
        background.frag
      index.ts
    debug.overlay/
      utilities/
        index.ts
      index.ts
```

There is no separate `stages/` layer for pass-owned behavior. The pass folder owns its declaration, utilities, and shaders. Use `utilities/index.ts` for draw preparation and feature functionality, while `index.ts` contains the pass declaration and pipeline-facing orchestration. Keep the pass file small, but keep the feature together.

A typical pass is intentionally small:

```ts
import { createRenderPass } from "@engine";
import { drawOverlay } from "@client/render/passes/debug.overlay/utilities";

export const OverlayPass = createRenderPass("debug:overlay")({
  execute({ renderer, registry, interpolationAlpha }) {
    drawOverlay(renderer, registry, interpolationAlpha);
  },
});
```

The pass name should identify the rendering concern and use a stable namespace, such as `debug:overlay`, `world:terrain`, or `ui:cursor`. The name is used for pass identity and diagnostics; it should describe the pass rather than a specific temporary implementation.

Register passes in the pipeline according to when they should appear:

- Use the main pass list for work that belongs in the normal ordered pipeline.
- Use a before-world collection for backgrounds or world-space preparation that must occur before entity rendering.
- Use an after-world collection for overlays, diagnostics, and presentation that must appear over the world.
- Use lifecycle overrides only when replacing a core pipeline stage is intentional.

## Render pass type inference

`createRenderPass` is a typed router into the render pipeline. Do not manually type the `execute` callback argument. The engine supplies the callback context type, and destructuring lets TypeScript infer every value correctly:

```ts
const Pass = createRenderPass("tools:selection")({
  execute({ renderer, queue, frameAllocator, registry, state, interpolationAlpha, spritePipe }) {
    // Each value is typed by the engine's render pipeline context.
    drawSelection(
      renderer,
      queue,
      frameAllocator,
      registry,
      state,
      interpolationAlpha,
      spritePipe,
    );
  },
});
```

The available context is provided by the pipeline and includes:

- `renderer`: the high-level renderer for camera-aware drawing, shapes, sprites, text, custom quads, and instanced buckets.
- `queue`: the current frame's render queue for commands that must be ordered with other world work.
- `frameAllocator`: the current frame allocator for pooled transient render commands and data.
- `registry`: the active ECS registry for the scene being rendered.
- `state`: pipeline-owned render state when the pipeline declares one.
- `interpolationAlpha`: the render interpolation amount between simulation updates.
- `spritePipe`: the engine's sprite rendering helper when sprite-specific preparation is needed.

The context is generic internally, but the pass author normally does not need to provide those generic arguments. The callback is the inference boundary: once the pass is created and registered in a pipeline, the router supplies the compatible allocator, state, registry, and renderer types. Adding an explicit object annotation to `execute` throws away this benefit and can make a pass incompatible with the pipeline's inferred state.

Prefer the narrowest destructuring needed:

```ts
const CameraMarkerPass = createRenderPass("debug:camera-marker")({
  execute({ renderer }) {
    drawCameraMarker(renderer);
  },
});
```

When a pipeline has typed custom state, read it through the inferred `state` property rather than recreating or casting its shape:

```ts
type RenderState = {
  readonly selectionBucket: GpuBucket;
};

const SelectionPass = createRenderPass("tools:selection")({
  execute({ renderer, state }) {
    renderer.drawInstancedBucket(state.selectionBucket, getCamera(renderer));
  },
});
```

## Frame work and ownership

Render work should be transient and frame-scoped wherever possible.

- Use the frame allocator for short-lived queue commands and command data.
- Reuse renderer-owned or feature-owned GPU resources instead of recreating them every frame.
- Keep reusable GPU resources tied to an explicit renderer or pipeline lifecycle.
- Derive camera bounds, interpolation, colors, and shader uniforms from current inputs.
- Avoid top-level mutable state unless it is clearly lifecycle-bound and safely keyed to the renderer or pipeline.
- Do not use a render pass to repair missing components or synchronize simulation state.

For a debug visualization, gate the pass at the owning debug setting before doing expensive work. If the debug setting changes during runtime, reading that setting in the pass is appropriate because it controls presentation only.

## Shader-backed rendering

A custom shader belongs to the rendering layer. Keep shader source next to the render feature and pass camera and feature values as uniforms. Use the renderer's existing custom-shader or instanced-bucket API instead of reaching into WebGL from a pass when a renderer abstraction already supports the operation.

A shader-backed pass generally follows this flow:

```ts
const bucketByRenderer = new WeakMap<Renderer, InstancedBucket>();

const ShaderPass = createRenderPass("debug:field")({
  execute({ renderer }) {
    if (!debugSettings.field) {
      return;
    }

    const bucket = getOrCreateBucket(renderer);
    updateViewportInstance(bucket, renderer);
    renderer.drawInstancedBucket(bucket, getCamera(renderer), {
      uRadius: field.radius,
      uColor: [1, 0.2, 0.7, 0.7],
    });
  },
});
```

The shader should receive only the values needed to derive the visual result. The pass owns ordering and gating; a stage or renderer helper may own buffer preparation and draw details.

## Review checklist

Before finishing a rendering change, verify:

- The pass lives under `render/passes/*` and has a stable namespaced name.
- The `execute` callback relies on inferred arguments rather than manually annotating its context.
- The pass is registered in the correct pipeline collection and draw order.
- Rendering reads authoritative state but does not mutate ECS state.
- Per-frame allocations are pooled or avoided in hot paths.
- Debug-only rendering exits before creating work when disabled.
- GPU resources have a clear renderer or pipeline lifecycle.
- Shader uniforms use current camera and feature values.
- Focused typecheck, lint, build, or rendering tests pass.
