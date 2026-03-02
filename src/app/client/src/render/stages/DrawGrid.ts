import { GridBounds } from "@client/components/grid-bounds";
import { GRID_CELL_SIZE } from "@client/scenes/world/systems/build-mode/const";
import { type UserWorld } from "@engine";
import { Color, Shape, Transform2D } from "@engine/components";
import { System as ContextSystem, fromContext } from "@engine/context";
import type {
    DenseShapeRenderData,
    EngineFrameAllocatorRegistry,
    InternalFrameAllocator,
    RenderQueue,
    Renderer,
} from "@engine/render";

const GRID_COLOR = new Color(1, 0.1, 0.75, 1);
const GRID_FILL = new Color(0, 0, 0, 0);
const GRID_LINE_WIDTH = 1;
const MAX_LINES_PER_AXIS = 600;
const GRID_LAYER = 0;
const GRID_Z_ORDER = 1;

const lineX = {
  type: "line" as const,
  x: 0,
  y: 0,
  width: 0,
  height: 1,
  rotation: Math.PI / 2,
  scaleX: 1,
  scaleY: 1,
  fill: GRID_FILL,
  stroke: GRID_COLOR,
  strokeWidth: GRID_LINE_WIDTH,
};

const lineY = {
  type: "line" as const,
  x: 0,
  y: 0,
  width: 0,
  height: 1,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  fill: GRID_FILL,
  stroke: GRID_COLOR,
  strokeWidth: GRID_LINE_WIDTH,
};

export function drawGrid(
  world: UserWorld,
  renderer: Renderer,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  const buildMode = fromContext(ContextSystem("main:build-mode"));

  if (buildMode && !buildMode.data.gridVisible) {
    return;
  }

  const viewportWidth = renderer.getWidth();
  const viewportHeight = renderer.getHeight();
  const cameraX = renderer.getCameraX();
  const cameraY = renderer.getCameraY();
  const cameraZoom = renderer.getCameraZoom();

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
    const shape = frameAllocator.acquire("engine:shape-command");
    writeLineShape(shape, lineX, x, lineCenterY, worldHeight);

    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shape-draw";
    command.world = world;
    command.entityId = null;
    command.shape = shape;
    command.layer = GRID_LAYER;
    command.zOrder = GRID_Z_ORDER;

    queue.add(command);
  }

  for (let y = minY; y <= maxY; y += yStep) {
    const shape = frameAllocator.acquire("engine:shape-command");
    writeLineShape(shape, lineY, lineCenterX, y, worldWidth);

    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shape-draw";
    command.world = world;
    command.entityId = null;
    command.shape = shape;
    command.layer = GRID_LAYER;
    command.zOrder = GRID_Z_ORDER;

    queue.add(command);
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

function writeLineShape(
  shape: DenseShapeRenderData,
  template: {
    type: "line";
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    fill: Color;
    stroke: Color | null;
    strokeWidth: number;
  },
  x: number,
  y: number,
  width: number,
): void {
  shape.type = template.type;
  shape.x = x;
  shape.y = y;
  shape.width = width;
  shape.height = template.height;
  shape.rotation = template.rotation;
  shape.scaleX = template.scaleX;
  shape.scaleY = template.scaleY;
  shape.fill.r = template.fill.r;
  shape.fill.g = template.fill.g;
  shape.fill.b = template.fill.b;
  shape.fill.a = template.fill.a;

  if (template.stroke) {
    if (shape.stroke === null) {
      shape.stroke = new Color(
        template.stroke.r,
        template.stroke.g,
        template.stroke.b,
        template.stroke.a,
      );
    } else {
      shape.stroke.r = template.stroke.r;
      shape.stroke.g = template.stroke.g;
      shape.stroke.b = template.stroke.b;
      shape.stroke.a = template.stroke.a;
    }
  } else {
    shape.stroke = null;
  }

  shape.strokeWidth = template.strokeWidth;
}
