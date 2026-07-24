import { beltStressPresentation } from "@client/scenes/belt-stress/presentation";
import { createRenderPass } from "@engine";

export const DrawBeltStressPass = createRenderPass("draw-belt-stress")({
  execute({ renderer }) {
    beltStressPresentation.draw(renderer);
  },
});
