import { FromRender, fromContext } from "@context";
import { createRenderPass } from "@core/render-pipeline/pass";

export const EndFramePass = createRenderPass("end-frame")({
  execute() {
    const renderer = fromContext(FromRender.Renderer);

    renderer.end();
  },
});
