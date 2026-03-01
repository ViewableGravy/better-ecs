import { applyActiveCameraToRenderer } from "@components/camera-utils";
import { FromRender, fromContext } from "@context";
import { createRenderPass } from "@core/render-pipeline/pass";

export const CameraControlPass = createRenderPass("camera-control")({
  scope: "world",
  execute() {
    const world = fromContext(FromRender.World);
    const renderer = fromContext(FromRender.Renderer);
    const interpolationAlpha = fromContext(FromRender.InterpolationAlpha);

    applyActiveCameraToRenderer(world, renderer, interpolationAlpha);
  },
});
