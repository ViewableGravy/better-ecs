import { Grid } from "@client/utilities/grid";
import type { Renderer } from "@engine/render";

export function drawDebugGrid(renderer: Renderer): void {
  if (!Grid.outlineDebuggingEnabled) {
    return;
  }

  renderer.drawShader({
    name: "debug:grid",
    uniforms: {
      uRadius: Grid.radius,
      uLineColor: [1, 0.15, 0.65, 0.75],
    },
  });
}