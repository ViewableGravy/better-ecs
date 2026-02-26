import { Color } from "../../../components/sprite";
import { createRenderPass } from "../pass";

const DEFAULT_CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

export const BeginFramePass = createRenderPass("begin-frame")({
  execute({ renderer }) {
    renderer.high.begin();
    renderer.high.clear(DEFAULT_CLEAR_COLOR);
  },
});
