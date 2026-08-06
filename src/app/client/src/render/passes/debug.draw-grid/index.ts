import { Grid } from "@client/utilities/grid";
import { createRenderPass } from "@engine";
import { fromContext, FromEngine, Mouse } from "@engine/context";

/**********************************************************************************************************
 *   PASS START
 **********************************************************************************************************/
export const DrawGridPass = createRenderPass("debug:draw-grid")({
  execute({ renderer }) {
    if (!Grid.outlineDebuggingEnabled) {
      return;
    }

    const { canvas } = fromContext(FromEngine.Engine);
    const mouse = fromContext(Mouse);
    const screenPointer = mouse.screen;
    const canvasBounds = canvas.getBoundingClientRect();
    const hasHoveredTile = screenPointer.x >= canvasBounds.left
      && screenPointer.x <= canvasBounds.right
      && screenPointer.y >= canvasBounds.top
      && screenPointer.y <= canvasBounds.bottom;
    const worldPointer = mouse.world(
      renderer.getCameraX(),
      renderer.getCameraY(),
      renderer.getCameraZoom(),
    );
    const hoveredTile = Grid.getGridIndexAtCoordinates(worldPointer.x, worldPointer.y);

    renderer.drawShader({
      name: "debug:grid",
      uniforms: {
        uRadius: Grid.radius,
        uChunkScale: 6,
        uLineColor: [1, 0.15, 0.65, 0.75],
        uHoveredTile: hoveredTile,
        uHasHoveredTile: hasHoveredTile ? 1 : 0,
        uHighlightColor: [0.15, 1, 0.35, 0.9],
      },
    });
  },
});