import { Color } from "../../../components/sprite";
import { fromContext, FromRender } from "../../../context";
import { createRenderPass } from "../pass";

const DEFAULT_CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

export const BeginFramePass = createRenderPass("begin-frame")({
  execute() {
    const renderer = fromContext(FromRender.Renderer);

    renderer.begin();
    renderer.clear(DEFAULT_CLEAR_COLOR);
  },
});
