import { applyActiveCameraToRenderer } from "../../../components/camera-utils";
import { FromRender, fromContext } from "../../../context";
import { createRenderPass } from "../pass";

export const CameraControlPass = createRenderPass("camera-control")({
  scope: "world",
  execute() {
    const world = fromContext(FromRender.World);
    const renderer = fromContext(FromRender.Renderer);
    const alpha = fromContext(FromRender.Alpha);

    applyActiveCameraToRenderer(world, renderer, alpha);
  },
});
