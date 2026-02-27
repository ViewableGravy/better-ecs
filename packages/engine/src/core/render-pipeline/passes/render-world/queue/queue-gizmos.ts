import { Gizmo } from "../../../../../components/gizmo";
import { Color } from "../../../../../components/sprite";
import { Transform2D } from "../../../../../components/transform";
import { resolveWorldTransform2D } from "../../../../../ecs/hierarchy";
import type { UserWorld } from "../../../../../ecs/world";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  RenderQueue,
  Renderer,
  ShapeRenderData,
} from "../../../../../render";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const GIZMO_LAYER = 10_000;
const GIZMO_Z_ORDER = 10_000;

const AXIS_LENGTH_PIXELS = 48;
const ARROW_HEAD_PIXELS = 12;
const RING_RADIUS_PIXELS = 64;
const RING_SEGMENTS = 48;

const AXIS_RED = new Color(1, 0.25, 0.25, 1);
const AXIS_GREEN = new Color(0.45, 1, 0.45, 1);
const RING_STROKE = new Color(0.92, 0.92, 0.92, 1);
const AXIS_RED_HOVER = new Color(1, 0.75, 0.35, 1);
const AXIS_GREEN_HOVER = new Color(0.85, 1, 0.45, 1);
const RING_STROKE_HOVER = new Color(1, 0.9, 0.45, 1);

const TRANSPARENT_FILL = new Color(0, 0, 0, 0);

const SHARED_TRANSFORM = new Transform2D();

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function queueGizmos(
  world: UserWorld,
  renderer: Renderer,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  const cameraZoom = renderer.getCameraZoom();
  if (cameraZoom <= 0) {
    return;
  }

  const axisLength = AXIS_LENGTH_PIXELS / cameraZoom;
  const arrowHead = ARROW_HEAD_PIXELS / cameraZoom;
  const ringRadius = RING_RADIUS_PIXELS / cameraZoom;

  for (const entityId of world.query(Gizmo, Transform2D)) {
    const gizmo = world.require(entityId, Gizmo);

    if (!resolveWorldTransform2D(world, entityId, SHARED_TRANSFORM)) {
      continue;
    }

    const centerX = SHARED_TRANSFORM.curr.pos.x;
    const centerY = SHARED_TRANSFORM.curr.pos.y;

    queueAxis(
      queue,
      frameAllocator,
      centerX,
      centerY,
      centerX + axisLength,
      centerY,
      gizmo.hoveredHandle === "axis-x" ? AXIS_RED_HOVER : AXIS_RED,
      arrowHead,
    );

    queueAxis(
      queue,
      frameAllocator,
      centerX,
      centerY,
      centerX,
      centerY - axisLength,
      gizmo.hoveredHandle === "axis-y" ? AXIS_GREEN_HOVER : AXIS_GREEN,
      arrowHead,
    );

    queueRing(
      queue,
      frameAllocator,
      centerX,
      centerY,
      ringRadius,
      gizmo.hoveredHandle === "ring" ? RING_STROKE_HOVER : RING_STROKE,
    );
  }
}

function queueAxis(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  stroke: Color,
  arrowHeadLength: number,
): void {
  queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke);

  const directionX = endX - startX;
  const directionY = endY - startY;
  const directionLength = Math.hypot(directionX, directionY);
  if (directionLength <= 0) {
    return;
  }

  const normX = directionX / directionLength;
  const normY = directionY / directionLength;

  const leftX = -normX * Math.cos(Math.PI / 4) + normY * Math.sin(Math.PI / 4);
  const leftY = -normX * Math.sin(Math.PI / 4) - normY * Math.cos(Math.PI / 4);
  const rightX = -normX * Math.cos(Math.PI / 4) - normY * Math.sin(Math.PI / 4);
  const rightY = normX * Math.sin(Math.PI / 4) - normY * Math.cos(Math.PI / 4);

  queueLine(
    queue,
    frameAllocator,
    endX,
    endY,
    endX + leftX * arrowHeadLength,
    endY + leftY * arrowHeadLength,
    stroke,
  );

  queueLine(
    queue,
    frameAllocator,
    endX,
    endY,
    endX + rightX * arrowHeadLength,
    endY + rightY * arrowHeadLength,
    stroke,
  );
}

function queueRing(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  radius: number,
  stroke: Color,
): void {
  const step = (Math.PI * 2) / RING_SEGMENTS;

  for (let index = 0; index < RING_SEGMENTS; index += 1) {
    const angleStart = index * step;
    const angleEnd = angleStart + step;

    const startX = centerX + Math.cos(angleStart) * radius;
    const startY = centerY + Math.sin(angleStart) * radius;
    const endX = centerX + Math.cos(angleEnd) * radius;
    const endY = centerY + Math.sin(angleEnd) * radius;

    queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke);
  }
}

function queueLine(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  stroke: Color,
): void {
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  const shape = frameAllocator.acquire("engine:shape-command");
  writeLineShape(shape, startX, startY, deltaX, deltaY, stroke);

  const command = frameAllocator.acquire("engine:render-command");
  command.type = "shape-draw";
  command.world = null;
  command.entityId = null;
  command.shape = shape;
  command.layer = GIZMO_LAYER;
  command.zOrder = GIZMO_Z_ORDER;

  queue.add(command);
}

function writeLineShape(
  shape: ShapeRenderData,
  startX: number,
  startY: number,
  deltaX: number,
  deltaY: number,
  stroke: Color,
): void {
  shape.type = "line";
  shape.x = startX + deltaX * 0.5;
  shape.y = startY + deltaY * 0.5;
  shape.width = Math.hypot(deltaX, deltaY);
  shape.height = 1;
  shape.rotation = Math.atan2(deltaY, deltaX);
  shape.scaleX = 1;
  shape.scaleY = 1;
  shape.fill.r = TRANSPARENT_FILL.r;
  shape.fill.g = TRANSPARENT_FILL.g;
  shape.fill.b = TRANSPARENT_FILL.b;
  shape.fill.a = TRANSPARENT_FILL.a;
  shape.stroke = stroke;
  shape.strokeWidth = 2;
}
