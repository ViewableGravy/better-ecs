import { createRenderPass } from "@repo/engine";
import { Color } from "@repo/engine/components";

const CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

export const BeginFramePass = createRenderPass("begin-frame")({
  execute({ renderer }) {
    renderer.high.begin();
    renderer.high.clear(CLEAR_COLOR);
  },
});
