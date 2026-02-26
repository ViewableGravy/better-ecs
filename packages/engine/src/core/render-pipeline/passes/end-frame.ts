import { createRenderPass } from "../pass";

export const EndFramePass = createRenderPass("end-frame")({
  execute({ renderer }) {
    renderer.end();
  },
});
