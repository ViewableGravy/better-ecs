import { Color } from "@engine/components/sprite/sprite";
import { fromContext, FromRender } from "@engine/context";
import { createRenderPass } from "@engine/core/render-pipeline/pass";

const DEFAULT_CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

export const BeginFramePass = createRenderPass("begin-frame")({
  execute() {
    const renderer = fromContext(FromRender.Renderer);

    renderer.begin();
    renderer.clear(DEFAULT_CLEAR_COLOR);
  },
});
