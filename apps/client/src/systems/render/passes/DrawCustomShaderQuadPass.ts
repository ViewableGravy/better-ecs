import { createRenderPass } from "@repo/engine";
import { ShaderTransform2D } from "@repo/engine/components";
import { Assets, RenderRenderer, fromContext } from "@repo/engine/context";

const DEMO_SHADER_TRANSFORM = new ShaderTransform2D(-500, -96, 96, 96);

export const DrawCustomShaderQuadPass = createRenderPass("draw-custom-shader-quad")({
  execute() {
    const shader = fromContext(Assets).getStrict("editor:demo-quad-shader");
    const renderer = fromContext(RenderRenderer);

    renderer.drawShaderQuad(shader, DEMO_SHADER_TRANSFORM, {
      time: performance.now(),
    });
  },
});
