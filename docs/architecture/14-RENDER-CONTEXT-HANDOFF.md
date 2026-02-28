# Render Context Refactor Handoff

## Why this is needed

Current render pipeline typing and engine registration can create circular inference pressure in app code:

- `Register.Engine` is inferred from `createAppEngine()`.
- Render pipeline code contributes to that engine shape.
- If render-facing APIs carry too much engine-linked type surface, TypeScript can collapse to `any`/`unknown` or report circular references.

Short-term behavior should remain ergonomic and type-safe in userland:

- `assets.get("editor:demo-quad-shader")` returns typed `ShaderSourceAsset | undefined`.
- `renderer.drawShaderQuad(shader, ...)` should accept the shader object, not an asset id string.

## What was changed (short-term)

- Renderer custom shader path remains object-based (`ShaderSourceAsset`) for draw calls.
- App bootstrap inference remains unchanged (`createAppEngine` + `Register.Engine` via module augmentation).
- Render pipeline initialization currently supports injected `{ canvas, assets }` so init does not require broad engine typing.

## Proposed target architecture

Introduce a dual-context `fromContext` overload model (single API, two context types).

### Overload shape

```ts
fromContext({
  type: "engine",
  select: (engineContext) => T,
});

fromContext({
  type: "render",
  select: (renderContext) => T,
});
```

### Runtime execution model

- **System execution**: only engine context is set.
- **Render pipeline execution**: both engine and render contexts are set.
- `fromContext(...)` dispatches to the relevant backing store based on `type`.

### Expected benefits

1. In render pipeline init, code can use `fromContext(Assets)` (engine-context path) instead of receiving assets as explicit args.
2. In render passes, render services can be selected from render context directly, reducing pass prop/context plumbing.
3. Public render-pipeline types can shrink while preserving local type safety in pass code.

## Recommended implementation shape

1. Define discriminated selector inputs for `fromContext`:
   - `{ type: "engine"; select: (engineContext) => T }`
   - `{ type: "render"; select: (renderContext) => T }`
2. Keep existing engine-context behavior as-is for systems.
3. Add render-context storage + setter/resetter utilities.
4. In render pipeline execution, set both contexts before pass execution and restore afterwards.
5. Add render-context selectors for:
   - renderer
   - frame allocator
   - queue
   - world provider / active world
   - optional pipeline-local state
6. Migrate pass internals to `fromContext({ type: "render", ... })` for render-time services.
7. Once migrated, reduce `RenderPassContext` generic surface and pass argument payload.

## Type-safety requirements

- `assets.get(...)` remains key-typed and returns correct asset value types.
- `renderer.drawShaderQuad(...)` accepts `ShaderSourceAsset` (not id strings).
- Do not introduce manual app engine type declarations in userland bootstrap.
- Avoid `any`/broad casts in context plumbing; keep assertion boundaries minimal and localized.

## Files most relevant to this refactor

- `packages/engine/src/core/render-pipeline/create.ts`
- `packages/engine/src/core/render-pipeline/context.ts`
- `packages/engine/src/core/render-pipeline/pass.ts`
- `packages/engine/src/context/index.ts` (reference pattern)
- `packages/engine/src/core/context.ts` (reference pattern)
- `packages/engine/src/core/engine-types.ts`
- `apps/client/src/systems/render/index.ts`
- `apps/client/src/systems/render/passes/DrawCustomShaderQuadPass.ts`

## Constraints to preserve

- Keep `Register.Engine` inference-based in app userland (no manual `AppEngine` type declaration in app bootstrap).
- Avoid `any`, non-null assertions, and broad `as` casts.
- Prefer guard clauses and minimal allocations in render hot paths.
- Keep public renderer API ergonomic for userland (shader object draw path remains supported).
