import { applyActiveCameraToRenderer } from "../../../components/camera-utils";
import { createRenderPass } from "../pass";

export const CameraControlPass = createRenderPass("camera-control")({
  scope: "world",
  execute({ world, renderer, alpha }) {
    applyActiveCameraToRenderer(world, renderer, alpha);
  },
});
