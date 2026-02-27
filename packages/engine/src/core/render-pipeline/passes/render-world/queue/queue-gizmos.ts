import {
  Gizmo,
  GIZMO_ARROW_HEAD_WORLD,
  GIZMO_AXIS_LENGTH_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_X_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD,
  GIZMO_PLANE_HANDLE_SIZE_WORLD,
  GIZMO_RING_RADIUS_WORLD,
  GIZMO_ROTATE_RING_RADIUS_WORLD,
} from "../../../../../components/gizmo";
import { Color } from "../../../../../components/sprite";
import { Transform2D } from "../../../../../components/transform";
import { resolveWorldTransform2D } from "../../../../../ecs/hierarchy";
import type { UserWorld } from "../../../../../ecs/world";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  Renderer,
  RenderQueue,
  ShapeRenderData,
} from "../../../../../render";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const GIZMO_LAYER = 10_000;
const GIZMO_Z_ORDER = 10_000;
const GIZMO_STROKE_WIDTH_SCREEN = 2;
const PLANE_CORNER_RADIUS_RATIO = 0.05;
const PLANE_CORNER_SEGMENTS = 4;
const ROTATE_DASH_LENGTH_SCREEN = 8;
const ROTATE_GAP_LENGTH_SCREEN = 6;

const RING_SEGMENTS = 48;

const AXIS_RED = new Color(1, 0.25, 0.25, 1);
const AXIS_GREEN = new Color(0.45, 1, 0.45, 1);
const RING_SCALE_STROKE = new Color(0.92, 0.92, 0.92, 1);
const RING_ROTATE_STROKE = new Color(0.3, 0.6, 1, 1);
const AXIS_RED_HOVER = new Color(1, 0.75, 0.35, 1);
const AXIS_GREEN_HOVER = new Color(0.85, 1, 0.45, 1);
const RING_SCALE_STROKE_HOVER = new Color(1, 0.9, 0.45, 1);
const RING_ROTATE_STROKE_HOVER = new Color(0.5, 0.75, 1, 1);
const PLANE_STROKE = new Color(0.95, 0.95, 0.95, 1);
const PLANE_STROKE_HOVER = new Color(1, 0.9, 0.45, 1);

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

  const strokeWidthWorld = GIZMO_STROKE_WIDTH_SCREEN / cameraZoom;
  const axisLength = GIZMO_AXIS_LENGTH_WORLD;
  const arrowHead = GIZMO_ARROW_HEAD_WORLD;
  const ringRadius = GIZMO_RING_RADIUS_WORLD;
  const rotateRingRadius = GIZMO_ROTATE_RING_RADIUS_WORLD;

  for (const entityId of world.query(Gizmo, Transform2D)) {
    const gizmo = world.require(entityId, Gizmo);

    if (!resolveWorldTransform2D(world, entityId, SHARED_TRANSFORM)) {
      continue;
    }

    const centerX = SHARED_TRANSFORM.curr.pos.x;
    const centerY = SHARED_TRANSFORM.curr.pos.y;
    const rotation = SHARED_TRANSFORM.curr.rotation;

    queueAxis(
      queue,
      frameAllocator,
      centerX,
      centerY,
      centerX + Math.cos(rotation) * axisLength,
      centerY + Math.sin(rotation) * axisLength,
      gizmo.hoveredHandle === "axis-x" ? AXIS_RED_HOVER : AXIS_RED,
      arrowHead,
      strokeWidthWorld,
    );

    queueAxis(
      queue,
      frameAllocator,
      centerX,
      centerY,
      centerX + Math.sin(rotation) * axisLength,
      centerY - Math.cos(rotation) * axisLength,
      gizmo.hoveredHandle === "axis-y" ? AXIS_GREEN_HOVER : AXIS_GREEN,
      arrowHead,
      strokeWidthWorld,
    );

    queueRing(
      queue,
      frameAllocator,
      centerX,
      centerY,
      ringRadius,
      rotateRingRadius,
      rotation,
      gizmo.hoveredHandle,
      strokeWidthWorld,
    );

    queueRotatePreview(
      queue,
      frameAllocator,
      centerX,
      centerY,
      gizmo,
      ROTATE_DASH_LENGTH_SCREEN / cameraZoom,
      ROTATE_GAP_LENGTH_SCREEN / cameraZoom,
      strokeWidthWorld,
    );

    queuePlaneHandle(
      queue,
      frameAllocator,
      centerX
        + GIZMO_PLANE_HANDLE_OFFSET_X_WORLD * Math.cos(rotation)
        - GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD * Math.sin(rotation),
      centerY
        + GIZMO_PLANE_HANDLE_OFFSET_X_WORLD * Math.sin(rotation)
        + GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD * Math.cos(rotation),
      GIZMO_PLANE_HANDLE_SIZE_WORLD,
      gizmo.hoveredHandle === "plane-xy" ? PLANE_STROKE_HOVER : PLANE_STROKE,
      strokeWidthWorld,
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
  strokeWidth: number,
): void {
  const half = size * 0.5;
  const minX = centerX - half;
  const maxX = centerX + half;
  const minY = centerY - half;
  const maxY = centerY + half;
  const cornerRadius = size * PLANE_CORNER_RADIUS_RATIO;

  queueLine(queue, frameAllocator, minX + cornerRadius, minY, maxX - cornerRadius, minY, stroke, strokeWidth);
  queueLine(queue, frameAllocator, maxX, minY + cornerRadius, maxX, maxY - cornerRadius, stroke, strokeWidth);
  queueLine(queue, frameAllocator, maxX - cornerRadius, maxY, minX + cornerRadius, maxY, stroke, strokeWidth);
  queueLine(queue, frameAllocator, minX, maxY - cornerRadius, minX, minY + cornerRadius, stroke, strokeWidth);

  queueCornerArc(
    queue,
    frameAllocator,
    minX + cornerRadius,
    minY + cornerRadius,
    cornerRadius,
    Math.PI,
    Math.PI * 1.5,
    stroke,
    strokeWidth,
  );
  queueCornerArc(
    queue,
    frameAllocator,
    maxX - cornerRadius,
    minY + cornerRadius,
    cornerRadius,
    Math.PI * 1.5,
    Math.PI * 2,
    stroke,
    strokeWidth,
  );
  queueCornerArc(
    queue,
    frameAllocator,
    maxX - cornerRadius,
    maxY - cornerRadius,
    cornerRadius,
    0,
    Math.PI * 0.5,
    stroke,
    strokeWidth,
  );
  queueCornerArc(
    queue,
    frameAllocator,
    minX + cornerRadius,
    maxY - cornerRadius,
    cornerRadius,
    Math.PI * 0.5,
    Math.PI,
    stroke,
    strokeWidth,
  );
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
  strokeWidth: number,
): void {
  queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke, strokeWidth);

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
    strokeWidth,
  );

  queueLine(
    queue,
    frameAllocator,
    endX,
    endY,
    endX + rightX * arrowHeadLength,
    endY + rightY * arrowHeadLength,
    stroke,
    strokeWidth,
  );
}

function queueRing(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  scaleRingRadius: number,
  rotateRingRadius: number,
  rotation: number,
  hoveredHandle: Gizmo["hoveredHandle"],
  strokeWidth: number,
): void {
  const step = (Math.PI * 2) / RING_SEGMENTS;

  for (let index = 0; index < RING_SEGMENTS; index += 1) {
    const angleStart = index * step;
    const angleEnd = angleStart + step;

    const startX = centerX + Math.cos(angleStart + rotation) * scaleRingRadius;
    const startY = centerY + Math.sin(angleStart + rotation) * scaleRingRadius;
    const endX = centerX + Math.cos(angleEnd + rotation) * scaleRingRadius;
    const endY = centerY + Math.sin(angleEnd + rotation) * scaleRingRadius;

    const stroke = hoveredHandle === "ring-scale" ? RING_SCALE_STROKE_HOVER : RING_SCALE_STROKE;
    queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke, strokeWidth);
  }

  for (let index = 0; index < RING_SEGMENTS; index += 1) {
    const angleStart = index * step;
    const angleEnd = angleStart + step;

    const midpointAngle = angleStart + step * 0.5;
    const midX = Math.cos(midpointAngle);
    const midY = Math.sin(midpointAngle);
    const isRotateQuadrant = midX >= 0 && midY <= 0;

    if (!isRotateQuadrant) {
      continue;
    }

    const startX = centerX + Math.cos(angleStart + rotation) * rotateRingRadius;
    const startY = centerY + Math.sin(angleStart + rotation) * rotateRingRadius;
    const endX = centerX + Math.cos(angleEnd + rotation) * rotateRingRadius;
    const endY = centerY + Math.sin(angleEnd + rotation) * rotateRingRadius;

    const stroke = hoveredHandle === "ring-rotate" ? RING_ROTATE_STROKE_HOVER : RING_ROTATE_STROKE;

    queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke, strokeWidth);
  }
}

function queueRotatePreview(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  gizmo: Gizmo,
  dashLength: number,
  gapLength: number,
  strokeWidth: number,
): void {
  if (
    gizmo.rotateStartDeltaX === null
    || gizmo.rotateStartDeltaY === null
    || gizmo.rotateCurrentDeltaX === null
    || gizmo.rotateCurrentDeltaY === null
    || gizmo.rotateAngleDelta === null
  ) {
    return;
  }

  const startX = centerX + gizmo.rotateStartDeltaX;
  const startY = centerY + gizmo.rotateStartDeltaY;
  const currentX = centerX + gizmo.rotateCurrentDeltaX;
  const currentY = centerY + gizmo.rotateCurrentDeltaY;

  queueDottedLine(
    queue,
    frameAllocator,
    centerX,
    centerY,
    startX,
    startY,
    RING_ROTATE_STROKE,
    strokeWidth,
    dashLength,
    gapLength,
  );

  queueLine(queue, frameAllocator, centerX, centerY, currentX, currentY, RING_ROTATE_STROKE_HOVER, strokeWidth);

  const startAngle = Math.atan2(gizmo.rotateStartDeltaY, gizmo.rotateStartDeltaX);
  const radius = Math.hypot(gizmo.rotateStartDeltaX, gizmo.rotateStartDeltaY);
  queueArc(
    queue,
    frameAllocator,
    centerX,
    centerY,
    radius,
    startAngle,
    startAngle + gizmo.rotateAngleDelta,
    RING_ROTATE_STROKE_HOVER,
    strokeWidth,
  );
}

function queueArc(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  stroke: Color,
  strokeWidth: number,
): void {
  const angleDelta = endAngle - startAngle;
  if (Math.abs(angleDelta) <= 0.0001) {
    return;
  }

  const segments = Math.max(6, Math.ceil((Math.abs(angleDelta) / (Math.PI * 2)) * RING_SEGMENTS));
  const step = angleDelta / segments;

  for (let index = 0; index < segments; index += 1) {
    const angleA = startAngle + step * index;
    const angleB = angleA + step;

    const startX = centerX + Math.cos(angleA) * radius;
    const startY = centerY + Math.sin(angleA) * radius;
    const endX = centerX + Math.cos(angleB) * radius;
    const endY = centerY + Math.sin(angleB) * radius;

    queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke, strokeWidth);
  }
}

function queueDottedLine(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  stroke: Color,
  strokeWidth: number,
  dashLength: number,
  gapLength: number,
): void {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const totalLength = Math.hypot(deltaX, deltaY);
  if (totalLength <= 0) {
    return;
  }

  const directionX = deltaX / totalLength;
  const directionY = deltaY / totalLength;
  const period = dashLength + gapLength;
  if (period <= 0) {
    return;
  }

  let cursor = 0;
  while (cursor < totalLength) {
    const dashStart = cursor;
    const dashEnd = Math.min(cursor + dashLength, totalLength);

    const segmentStartX = startX + directionX * dashStart;
    const segmentStartY = startY + directionY * dashStart;
    const segmentEndX = startX + directionX * dashEnd;
    const segmentEndY = startY + directionY * dashEnd;

    queueLine(queue, frameAllocator, segmentStartX, segmentStartY, segmentEndX, segmentEndY, stroke, strokeWidth);
    cursor += period;
  }
}

function queueCornerArc(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  stroke: Color,
  strokeWidth: number,
): void {
  const step = (endAngle - startAngle) / PLANE_CORNER_SEGMENTS;
  for (let index = 0; index < PLANE_CORNER_SEGMENTS; index += 1) {
    const angleA = startAngle + step * index;
    const angleB = angleA + step;

    const startX = centerX + Math.cos(angleA) * radius;
    const startY = centerY + Math.sin(angleA) * radius;
    const endX = centerX + Math.cos(angleB) * radius;
    const endY = centerY + Math.sin(angleB) * radius;

    queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke, strokeWidth);
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
  strokeWidth: number,
): void {
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  const shape = frameAllocator.acquire("engine:shape-command");
  writeLineShape(shape, startX, startY, deltaX, deltaY, stroke, strokeWidth);

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
  strokeWidth: number,
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
  shape.strokeWidth = strokeWidth;
}
