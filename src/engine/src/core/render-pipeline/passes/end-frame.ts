import { FromRender, fromContext } from "@engine/context";
import { createRenderPass } from "@engine/core/render-pipeline/pass";

export const EndFramePass = createRenderPass("end-frame")({
  execute() {
    const renderer = fromContext(FromRender.Renderer);

    renderer.end();
  },
});
