import { GRID_CELL_SIZE } from "@/systems/build-mode/constants";
import { buildModeState } from "@/systems/build-mode/state";
import { Color } from "@repo/engine/components";
import type { Renderer } from "@repo/engine/render";

const GRID_COLOR = new Color(1, 0.1, 0.75, 1);
const GRID_FILL = new Color(0, 0, 0, 0);
const GRID_LINE_WIDTH = 1;
const MAX_LINES_PER_AXIS = 600;

export function drawGrid(renderer: Renderer): void {
  if (!buildModeState.gridVisible) {
    return;
  }

  const viewportWidth = renderer.low.getWidth();
  const viewportHeight = renderer.low.getHeight();
  const cameraX = renderer.low.getCameraX();
  const cameraY = renderer.low.getCameraY();
  const cameraZoom = renderer.low.getCameraZoom();

  if (cameraZoom <= 0) {
    return;
  }

  const halfWidth = viewportWidth / (2 * cameraZoom);
  const halfHeight = viewportHeight / (2 * cameraZoom);

  const minX = Math.floor((cameraX - halfWidth) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const maxX = Math.ceil((cameraX + halfWidth) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const minY = Math.floor((cameraY - halfHeight) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const maxY = Math.ceil((cameraY + halfHeight) / GRID_CELL_SIZE) * GRID_CELL_SIZE;

  const rawColumns = Math.max(1, Math.ceil((maxX - minX) / GRID_CELL_SIZE));
  const rawRows = Math.max(1, Math.ceil((maxY - minY) / GRID_CELL_SIZE));

  const xStride = Math.max(1, Math.ceil(rawColumns / MAX_LINES_PER_AXIS));
  const yStride = Math.max(1, Math.ceil(rawRows / MAX_LINES_PER_AXIS));

  const xStep = GRID_CELL_SIZE * xStride;
  const yStep = GRID_CELL_SIZE * yStride;

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  for (let x = minX; x <= maxX; x += xStep) {
    renderer.low.drawShape({
      type: "line",
      x,
      y: cameraY,
      width: worldHeight,
      height: 1,
      rotation: Math.PI / 2,
      scaleX: 1,
      scaleY: 1,
      fill: GRID_FILL,
      stroke: GRID_COLOR,
      strokeWidth: GRID_LINE_WIDTH,
    });
  }

  for (let y = minY; y <= maxY; y += yStep) {
    renderer.low.drawShape({
      type: "line",
      x: cameraX,
      y,
      width: worldWidth,
      height: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fill: GRID_FILL,
      stroke: GRID_COLOR,
      strokeWidth: GRID_LINE_WIDTH,
    });
  }
}
