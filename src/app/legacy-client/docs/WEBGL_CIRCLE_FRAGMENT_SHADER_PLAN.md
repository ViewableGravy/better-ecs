# WebGL Circle Rendering Plan (Deferred)

## Goal
Implement circle rendering in the WebGL backend using a **fragment shader mask** (Hazel-style), instead of generating circle triangle geometry on the CPU.

## Source Reference
- Hazel circle shader:
  - https://github.com/TheCherno/Hazel/blob/master/Hazelnut/assets/shaders/Renderer2D_Circle.glsl

## Decisions
1. Circle fill should be computed in the fragment stage.
2. Shader assets for engine rendering should live under:
   - `packages/engine/src/assets/shaders`
3. Client build should support importing `.glsl` shader source files via plugin support.

## Proposed Engine File Layout
- `packages/engine/src/assets/shaders/renderer2d-circle.vert.glsl`
- `packages/engine/src/assets/shaders/renderer2d-circle.frag.glsl`
- `packages/engine/src/render/renderers/webGL/` (shader program creation + uniform setup)

## Implementation Outline
1. **Port Hazel circle shader logic**
   - Split into vertex + fragment shader files in `engine/src/assets/shaders`.
   - Keep the same conceptual approach:
     - pass local-space position
     - compute signed/soft circle edge in fragment shader
     - support thickness/fade-like controls (or equivalent uniforms)

2. **Adjust WebGL circle path**
   - Replace current CPU-generated circle fan vertices in `WebGLRenderAPI`.
   - Submit quad geometry for circles and let fragment shader discard/alpha-mask pixels outside the circle.

3. **Data model wiring**
   - Ensure per-circle data can provide:
     - transform/world position
     - size/radius
     - color
     - optional edge parameters (thickness/fade)

4. **Shader loading support in client build**
   - Add GLSL loading support for Vite in the client project using:
     - `rollup-plugin-glsl`
   - Reference:
     - https://github.com/vwochnik/rollup-plugin-glsl

5. **Validation**
   - Ensure circles visually match prior behavior for position/scale/rotation.
   - Verify no regressions in sprite/shape rendering.
   - Confirm client build and engine tests still pass.

## Notes for Later
- We are intentionally deferring implementation now.
- This document is the agreed direction for the next circle-rendering pass.
