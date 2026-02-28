import { createRenderPass } from "@repo/engine";
import { ShaderTransform2D } from "@repo/engine/components";
import { Assets, fromContext } from "@repo/engine/context";

const DEMO_SHADER_TRANSFORM = new ShaderTransform2D(-500, -96, 96, 96);

export const DrawCustomShaderQuadPass = createRenderPass("draw-custom-shader-quad")({
  execute({ renderer }) {
    const shader = fromContext(Assets).get("editor:demo-quad-shader");

    if (!shader) {
      return;
    }

    renderer.drawShaderQuad(shader, DEMO_SHADER_TRANSFORM, {
      time: performance.now(),
    });
  },
});
