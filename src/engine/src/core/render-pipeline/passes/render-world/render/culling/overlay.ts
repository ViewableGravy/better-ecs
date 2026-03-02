import { Color } from "@engine/components/sprite/sprite";
import type { CullingBounds } from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import type { Renderer } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ShapeRenderer = Pick<Renderer, "drawShape">;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const CULLING_DEBUG_STROKE = new Color(0, 1, 0.2, 0.9);

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function drawCullingBoundsOverlay(renderer: ShapeRenderer, bounds: CullingBounds): void {
  drawCullingLine(renderer, bounds.minX, bounds.minY, bounds.maxX, bounds.minY);
  drawCullingLine(renderer, bounds.maxX, bounds.minY, bounds.maxX, bounds.maxY);
  drawCullingLine(renderer, bounds.maxX, bounds.maxY, bounds.minX, bounds.maxY);
  drawCullingLine(renderer, bounds.minX, bounds.maxY, bounds.minX, bounds.minY);
}

function drawCullingLine(
  renderer: ShapeRenderer,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const length = Math.hypot(deltaX, deltaY);

  if (length <= 0) {
    return;
  }

  renderer.drawShape({
    type: "line",
    x: (fromX + toX) * 0.5,
    y: (fromY + toY) * 0.5,
    width: length,
    height: 1,
    rotation: Math.atan2(deltaY, deltaX),
    scaleX: 1,
    scaleY: 1,
    fill: CULLING_DEBUG_STROKE,
    stroke: CULLING_DEBUG_STROKE,
    strokeWidth: 2,
  });
}
