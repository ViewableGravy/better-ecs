import {
  Gizmo,
  GIZMO_ARROW_HEAD_WORLD,
  GIZMO_AXIS_LENGTH_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_X_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD,
  GIZMO_PLANE_HANDLE_SIZE_WORLD,
  GIZMO_RING_RADIUS_WORLD,
} from "../../../../../components/gizmo";
import { Color } from "../../../../../components/sprite";
import { Transform2D } from "../../../../../components/transform";
import { resolveWorldTransform2D } from "../../../../../ecs/hierarchy";
import type { UserWorld } from "../../../../../ecs/world";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  RenderQueue,
  ShapeRenderData,
} from "../../../../../render";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const GIZMO_LAYER = 10_000;
const GIZMO_Z_ORDER = 10_000;

const RING_SEGMENTS = 48;

const AXIS_RED = new Color(1, 0.25, 0.25, 1);
const AXIS_GREEN = new Color(0.45, 1, 0.45, 1);
const RING_STROKE = new Color(0.92, 0.92, 0.92, 1);
const AXIS_RED_HOVER = new Color(1, 0.75, 0.35, 1);
const AXIS_GREEN_HOVER = new Color(0.85, 1, 0.45, 1);
const RING_STROKE_HOVER = new Color(1, 0.9, 0.45, 1);
const PLANE_STROKE = new Color(0.95, 0.95, 0.95, 1);
const PLANE_STROKE_HOVER = new Color(1, 0.9, 0.45, 1);

const TRANSPARENT_FILL = new Color(0, 0, 0, 0);

const SHARED_TRANSFORM = new Transform2D();

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function queueGizmos(
  world: UserWorld,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  const axisLength = GIZMO_AXIS_LENGTH_WORLD;
  const arrowHead = GIZMO_ARROW_HEAD_WORLD;
  const ringRadius = GIZMO_RING_RADIUS_WORLD;

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

    queuePlaneHandle(
      queue,
      frameAllocator,
      centerX + GIZMO_PLANE_HANDLE_OFFSET_X_WORLD,
      centerY + GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD,
      GIZMO_PLANE_HANDLE_SIZE_WORLD,
      gizmo.hoveredHandle === "plane-xy" ? PLANE_STROKE_HOVER : PLANE_STROKE,
    );
  }
}

function queuePlaneHandle(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  size: number,
  stroke: Color,
): void {
  const halfSize = size * 0.5;
  const minX = centerX - halfSize;
  const maxX = centerX + halfSize;
  const minY = centerY - halfSize;
  const maxY = centerY + halfSize;

  queueLine(queue, frameAllocator, minX, minY, maxX, minY, stroke);
  queueLine(queue, frameAllocator, maxX, minY, maxX, maxY, stroke);
  queueLine(queue, frameAllocator, maxX, maxY, minX, maxY, stroke);
  queueLine(queue, frameAllocator, minX, maxY, minX, minY, stroke);
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
