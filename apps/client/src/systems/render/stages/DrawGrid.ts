import { GridBounds } from "@/components/grid-bounds";
import { GRID_CELL_SIZE } from "@/scenes/spatial-contexts-demo/build-mode/const";
import { buildModeState } from "@/scenes/spatial-contexts-demo/build-mode/state";
import type { UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import type { Renderer } from "@repo/engine/render";

const GRID_COLOR = new Color(1, 0.1, 0.75, 1);
const GRID_FILL = new Color(0, 0, 0, 0);
const GRID_LINE_WIDTH = 1;
const MAX_LINES_PER_AXIS = 600;

export function drawGrid(world: UserWorld, renderer: Renderer): void {
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

  const viewportMinX = Math.floor((cameraX - halfWidth) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const viewportMaxX = Math.ceil((cameraX + halfWidth) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const viewportMinY = Math.floor((cameraY - halfHeight) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const viewportMaxY = Math.ceil((cameraY + halfHeight) / GRID_CELL_SIZE) * GRID_CELL_SIZE;

  const bounds = getGridBounds(world);

  const minX = bounds ? Math.max(viewportMinX, alignDown(bounds.minX)) : viewportMinX;
  const maxX = bounds ? Math.min(viewportMaxX, alignUp(bounds.maxX)) : viewportMaxX;
  const minY = bounds ? Math.max(viewportMinY, alignDown(bounds.minY)) : viewportMinY;
  const maxY = bounds ? Math.min(viewportMaxY, alignUp(bounds.maxY)) : viewportMaxY;

  if (minX > maxX || minY > maxY) {
    return;
  }

  const rawColumns = Math.max(1, Math.ceil((maxX - minX) / GRID_CELL_SIZE));
  const rawRows = Math.max(1, Math.ceil((maxY - minY) / GRID_CELL_SIZE));

  const xStride = Math.max(1, Math.ceil(rawColumns / MAX_LINES_PER_AXIS));
  const yStride = Math.max(1, Math.ceil(rawRows / MAX_LINES_PER_AXIS));

  const xStep = GRID_CELL_SIZE * xStride;
  const yStep = GRID_CELL_SIZE * yStride;

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;
  const lineCenterX = (minX + maxX) * 0.5;
  const lineCenterY = (minY + maxY) * 0.5;

  for (let x = minX; x <= maxX; x += xStep) {
    renderer.low.drawShape({
      type: "line",
      x,
      y: lineCenterY,
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
      x: lineCenterX,
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

function alignDown(value: number): number {
  return Math.floor(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
}

function alignUp(value: number): number {
  return Math.ceil(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
}

function getGridBounds(world: UserWorld):
  | {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }
  | undefined {
  for (const id of world.query(GridBounds, Shape, Transform2D)) {
    const shape = world.get(id, Shape);
    const transform = world.get(id, Transform2D);

    if (!shape || !transform || shape.type !== "rectangle") {
      continue;
    }

    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;

    return {
      minX: transform.curr.pos.x - halfWidth,
      minY: transform.curr.pos.y - halfHeight,
      maxX: transform.curr.pos.x + halfWidth,
      maxY: transform.curr.pos.y + halfHeight,
    };
  }

  return undefined;
}
