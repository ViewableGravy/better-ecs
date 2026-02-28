import { FromRender, fromContext } from "../../../context";
import { createRenderPass } from "../pass";

export const EndFramePass = createRenderPass("end-frame")({
  execute() {
    const renderer = fromContext(FromRender.Renderer);

    renderer.end();
  },
});
