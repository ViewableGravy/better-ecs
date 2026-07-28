import type { Registry } from "@engine";
import { Rgba } from "@engine/components";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  Renderer,
  RenderQueue,
} from "@engine/render";

const CELL_SIZE = 32;
const GRID_COLOR = new Rgba(0.25, 0.3, 0.38, 0.45);
const GRID_FILL = new Rgba(0, 0, 0, 0);
const MAX_LINES_PER_AXIS = 200;
type LineTemplate = {
  type: "line";
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  fill: Rgba;
  stroke: Rgba;
  strokeWidth: number;
};

const LINE_X = createLine(Math.PI / 2);
const LINE_Y = createLine(0);

export function drawGrid(
  world: Registry,
  renderer: Renderer,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  const zoom = renderer.getCameraZoom();
  if (zoom <= 0) {
    return;
  }

  const halfWidth = renderer.getWidth() / (2 * zoom);
  const halfHeight = renderer.getHeight() / (2 * zoom);
  const cameraX = renderer.getCameraX();
  const cameraY = renderer.getCameraY();
  const minX = alignDown(cameraX - halfWidth);
  const maxX = alignUp(cameraX + halfWidth);
  const minY = alignDown(cameraY - halfHeight);
  const maxY = alignUp(cameraY + halfHeight);
  const xStep = CELL_SIZE * Math.max(1, Math.ceil((maxX - minX) / CELL_SIZE / MAX_LINES_PER_AXIS));
  const yStep = CELL_SIZE * Math.max(1, Math.ceil((maxY - minY) / CELL_SIZE / MAX_LINES_PER_AXIS));

  for (let x = minX; x <= maxX; x += xStep) {
    enqueueLine(world, queue, frameAllocator, LINE_X, x, cameraY, maxY - minY);
  }

  for (let y = minY; y <= maxY; y += yStep) {
    enqueueLine(world, queue, frameAllocator, LINE_Y, cameraX, y, maxX - minX);
  }
}

function createLine(rotation: number): LineTemplate {
  return {
    type: "line",
    height: 1,
    rotation,
    scaleX: 1,
    scaleY: 1,
    fill: GRID_FILL,
    stroke: GRID_COLOR,
    strokeWidth: 1,
  };
}

function enqueueLine(
  world: Registry,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  template: LineTemplate,
  x: number,
  y: number,
  length: number,
): void {
  const shape = frameAllocator.acquire("engine:shape-command");
  shape.type = template.type;
  shape.x = x;
  shape.y = y;
  shape.width = length;
  shape.height = template.height;
  shape.rotation = template.rotation;
  shape.scaleX = template.scaleX;
  shape.scaleY = template.scaleY;
  shape.fill.r = template.fill.r;
  shape.fill.g = template.fill.g;
  shape.fill.b = template.fill.b;
  shape.fill.a = template.fill.a;

  if (shape.stroke === null) {
    shape.stroke = new Rgba(template.stroke.r, template.stroke.g, template.stroke.b, template.stroke.a);
  } else {
    shape.stroke.r = template.stroke.r;
    shape.stroke.g = template.stroke.g;
    shape.stroke.b = template.stroke.b;
    shape.stroke.a = template.stroke.a;
  }
  shape.strokeWidth = template.strokeWidth;

  const command = frameAllocator.acquire("engine:render-command");
  command.type = "shape-draw";
  command.registry = world;
  command.entityId = null;
  command.shape = shape;
  command.layer = -1;
  command.zOrder = 0;
  queue.add(command);
}

function alignDown(value: number): number {
  return Math.floor(value / CELL_SIZE) * CELL_SIZE;
}

function alignUp(value: number): number {
  return Math.ceil(value / CELL_SIZE) * CELL_SIZE;
}
