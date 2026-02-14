import { createRenderPass } from "@repo/engine";

export const EndFramePass = createRenderPass("end-frame")({
  execute({ renderer }) {
    renderer.high.end();
  },
});
