import {
  Gizmo,
  GIZMO_ARROW_HEAD_WORLD,
  GIZMO_AXIS_LENGTH_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_X_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD,
  GIZMO_PLANE_HANDLE_SIZE_WORLD,
  GIZMO_RING_RADIUS_WORLD,
  GIZMO_ROTATE_RING_RADIUS_WORLD,
  GIZMO_SCALE_MIN_DISTANCE_WORLD,
  type GizmoHandle,
} from "@components/gizmo";
import { Color } from "@components/sprite";
import { Transform2D } from "@components/transform";
import { fromContext, FromRender } from "@context";
import { resolveWorldTransform2D } from "@ecs/hierarchy";
import type { UserWorld } from "@ecs/world";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  Renderer,
  RenderQueue,
  ShapeRenderData,
} from "@render";

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
const SCALE_DASH_LENGTH_SCREEN = 6;
const SCALE_GAP_LENGTH_SCREEN = 6;
const SCALE_PREVIEW_FILL_ALPHA = 0.3;
const MIN_DONUT_THICKNESS_WORLD = 0.25;
const INACTIVE_HANDLE_ALPHA = 0.2;

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
const AXIS_RED_INACTIVE = new Color(1, 0.25, 0.25, INACTIVE_HANDLE_ALPHA);
const AXIS_GREEN_INACTIVE = new Color(0.45, 1, 0.45, INACTIVE_HANDLE_ALPHA);
const RING_SCALE_STROKE_INACTIVE = new Color(0.92, 0.92, 0.92, INACTIVE_HANDLE_ALPHA);
const RING_ROTATE_STROKE_INACTIVE = new Color(0.3, 0.6, 1, INACTIVE_HANDLE_ALPHA);
const AXIS_RED_HOVER_INACTIVE = new Color(1, 0.75, 0.35, INACTIVE_HANDLE_ALPHA);
const AXIS_GREEN_HOVER_INACTIVE = new Color(0.85, 1, 0.45, INACTIVE_HANDLE_ALPHA);
const RING_SCALE_STROKE_HOVER_INACTIVE = new Color(1, 0.9, 0.45, INACTIVE_HANDLE_ALPHA);
const RING_ROTATE_STROKE_HOVER_INACTIVE = new Color(0.5, 0.75, 1, INACTIVE_HANDLE_ALPHA);
const PLANE_STROKE_INACTIVE = new Color(0.95, 0.95, 0.95, INACTIVE_HANDLE_ALPHA);
const PLANE_STROKE_HOVER_INACTIVE = new Color(1, 0.9, 0.45, INACTIVE_HANDLE_ALPHA);
const SCALE_PREVIEW_FILL = new Color(1, 1, 1, SCALE_PREVIEW_FILL_ALPHA);

const TRANSPARENT_FILL = new Color(0, 0, 0, 0);

const SHARED_TRANSFORM = new Transform2D();

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function queueGizmos(
  world: UserWorld = fromContext(FromRender.World),
  renderer: Pick<Renderer, "getCameraZoom"> = fromContext(FromRender.Renderer),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
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
    const activeHandle = gizmo.activeHandle;

    const axisXStroke = resolveHandleStroke(
      gizmo.hoveredHandle === "axis-x" ? AXIS_RED_HOVER : AXIS_RED,
      activeHandle,
      "axis-x",
    );
    const axisYStroke = resolveHandleStroke(
      gizmo.hoveredHandle === "axis-y" ? AXIS_GREEN_HOVER : AXIS_GREEN,
      activeHandle,
      "axis-y",
    );

    queueAxis(
      queue,
      frameAllocator,
      centerX,
      centerY,
      centerX + Math.cos(rotation) * axisLength,
      centerY + Math.sin(rotation) * axisLength,
      axisXStroke,
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
      axisYStroke,
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
      activeHandle,
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

    queueScalePreview(
      queue,
      frameAllocator,
      centerX,
      centerY,
      gizmo,
      SCALE_DASH_LENGTH_SCREEN / cameraZoom,
      SCALE_GAP_LENGTH_SCREEN / cameraZoom,
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
      rotation,
      GIZMO_PLANE_HANDLE_SIZE_WORLD,
      resolveHandleStroke(
        gizmo.hoveredHandle === "plane-xy" ? PLANE_STROKE_HOVER : PLANE_STROKE,
        activeHandle,
        "plane-xy",
      ),
      strokeWidthWorld,
    );
  }
}

function queuePlaneHandle(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  rotation: number,
  size: number,
  stroke: Color,
  strokeWidth: number,
): void {
  const half = size * 0.5;
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);
  const cornerRadius = size * PLANE_CORNER_RADIUS_RATIO;

  const [topStartX, topStartY] = rotateLocalPoint(-half + cornerRadius, -half, centerX, centerY, cosRotation, sinRotation);
  const [topEndX, topEndY] = rotateLocalPoint(half - cornerRadius, -half, centerX, centerY, cosRotation, sinRotation);
  const [rightStartX, rightStartY] = rotateLocalPoint(half, -half + cornerRadius, centerX, centerY, cosRotation, sinRotation);
  const [rightEndX, rightEndY] = rotateLocalPoint(half, half - cornerRadius, centerX, centerY, cosRotation, sinRotation);
  const [bottomStartX, bottomStartY] = rotateLocalPoint(half - cornerRadius, half, centerX, centerY, cosRotation, sinRotation);
  const [bottomEndX, bottomEndY] = rotateLocalPoint(-half + cornerRadius, half, centerX, centerY, cosRotation, sinRotation);
  const [leftStartX, leftStartY] = rotateLocalPoint(-half, half - cornerRadius, centerX, centerY, cosRotation, sinRotation);
  const [leftEndX, leftEndY] = rotateLocalPoint(-half, -half + cornerRadius, centerX, centerY, cosRotation, sinRotation);

  queueLine(queue, frameAllocator, topStartX, topStartY, topEndX, topEndY, stroke, strokeWidth);
  queueLine(queue, frameAllocator, rightStartX, rightStartY, rightEndX, rightEndY, stroke, strokeWidth);
  queueLine(queue, frameAllocator, bottomStartX, bottomStartY, bottomEndX, bottomEndY, stroke, strokeWidth);
  queueLine(queue, frameAllocator, leftStartX, leftStartY, leftEndX, leftEndY, stroke, strokeWidth);

  const [topLeftCenterX, topLeftCenterY] = rotateLocalPoint(
    -half + cornerRadius,
    -half + cornerRadius,
    centerX,
    centerY,
    cosRotation,
    sinRotation,
  );
  const [topRightCenterX, topRightCenterY] = rotateLocalPoint(
    half - cornerRadius,
    -half + cornerRadius,
    centerX,
    centerY,
    cosRotation,
    sinRotation,
  );
  const [bottomRightCenterX, bottomRightCenterY] = rotateLocalPoint(
    half - cornerRadius,
    half - cornerRadius,
    centerX,
    centerY,
    cosRotation,
    sinRotation,
  );
  const [bottomLeftCenterX, bottomLeftCenterY] = rotateLocalPoint(
    -half + cornerRadius,
    half - cornerRadius,
    centerX,
    centerY,
    cosRotation,
    sinRotation,
  );

  queueCornerArc(
    queue,
    frameAllocator,
    topLeftCenterX,
    topLeftCenterY,
    cornerRadius,
    Math.PI,
    Math.PI * 1.5,
    rotation,
    stroke,
    strokeWidth,
  );
  queueCornerArc(
    queue,
    frameAllocator,
    topRightCenterX,
    topRightCenterY,
    cornerRadius,
    Math.PI * 1.5,
    Math.PI * 2,
    rotation,
    stroke,
    strokeWidth,
  );
  queueCornerArc(
    queue,
    frameAllocator,
    bottomRightCenterX,
    bottomRightCenterY,
    cornerRadius,
    0,
    Math.PI * 0.5,
    rotation,
    stroke,
    strokeWidth,
  );
  queueCornerArc(
    queue,
    frameAllocator,
    bottomLeftCenterX,
    bottomLeftCenterY,
    cornerRadius,
    Math.PI * 0.5,
    Math.PI,
    rotation,
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
  activeHandle: Gizmo["activeHandle"],
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

    const stroke = resolveHandleStroke(
      hoveredHandle === "ring-scale" ? RING_SCALE_STROKE_HOVER : RING_SCALE_STROKE,
      activeHandle,
      "ring-scale",
    );
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

    const stroke = resolveHandleStroke(
      hoveredHandle === "ring-rotate" ? RING_ROTATE_STROKE_HOVER : RING_ROTATE_STROKE,
      activeHandle,
      "ring-rotate",
    );

    queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke, strokeWidth);
  }
}

function resolveHandleStroke(
  stroke: Color,
  activeHandle: Gizmo["activeHandle"],
  handle: GizmoHandle,
): Color {
  if (activeHandle === null || activeHandle === handle) {
    return stroke;
  }

  if (stroke === AXIS_RED) {
    return AXIS_RED_INACTIVE;
  }

  if (stroke === AXIS_RED_HOVER) {
    return AXIS_RED_HOVER_INACTIVE;
  }

  if (stroke === AXIS_GREEN) {
    return AXIS_GREEN_INACTIVE;
  }

  if (stroke === AXIS_GREEN_HOVER) {
    return AXIS_GREEN_HOVER_INACTIVE;
  }

  if (stroke === RING_SCALE_STROKE) {
    return RING_SCALE_STROKE_INACTIVE;
  }

  if (stroke === RING_SCALE_STROKE_HOVER) {
    return RING_SCALE_STROKE_HOVER_INACTIVE;
  }

  if (stroke === RING_ROTATE_STROKE) {
    return RING_ROTATE_STROKE_INACTIVE;
  }

  if (stroke === RING_ROTATE_STROKE_HOVER) {
    return RING_ROTATE_STROKE_HOVER_INACTIVE;
  }

  if (stroke === PLANE_STROKE) {
    return PLANE_STROKE_INACTIVE;
  }

  if (stroke === PLANE_STROKE_HOVER) {
    return PLANE_STROKE_HOVER_INACTIVE;
  }

  return stroke;
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
  angleOffset: number,
  stroke: Color,
  strokeWidth: number,
): void {
  const step = (endAngle - startAngle) / PLANE_CORNER_SEGMENTS;
  for (let index = 0; index < PLANE_CORNER_SEGMENTS; index += 1) {
    const angleA = startAngle + step * index;
    const angleB = angleA + step;

    const startX = centerX + Math.cos(angleA + angleOffset) * radius;
    const startY = centerY + Math.sin(angleA + angleOffset) * radius;
    const endX = centerX + Math.cos(angleB + angleOffset) * radius;
    const endY = centerY + Math.sin(angleB + angleOffset) * radius;

    queueLine(queue, frameAllocator, startX, startY, endX, endY, stroke, strokeWidth);
  }
}

function queueScalePreview(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  gizmo: Gizmo,
  dashLength: number,
  gapLength: number,
  strokeWidth: number,
): void {
  if (gizmo.scaleStartDistance === null || gizmo.scaleCurrentDistance === null) {
    return;
  }

  const startRadius = Math.max(gizmo.scaleStartDistance, GIZMO_SCALE_MIN_DISTANCE_WORLD);
  const currentRadius = Math.max(gizmo.scaleCurrentDistance, GIZMO_SCALE_MIN_DISTANCE_WORLD);
  const innerRadius = Math.min(startRadius, currentRadius);
  const outerRadius = Math.max(startRadius, currentRadius);
  const donutThickness = outerRadius - innerRadius;

  if (donutThickness >= MIN_DONUT_THICKNESS_WORLD) {
    queueArc(
      queue,
      frameAllocator,
      centerX,
      centerY,
      innerRadius + donutThickness * 0.5,
      0,
      Math.PI * 2,
      SCALE_PREVIEW_FILL,
      donutThickness,
    );
  }

  queueDottedArc(
    queue,
    frameAllocator,
    centerX,
    centerY,
    startRadius,
    RING_SCALE_STROKE,
    strokeWidth,
    dashLength,
    gapLength,
  );

  queueArc(
    queue,
    frameAllocator,
    centerX,
    centerY,
    currentRadius,
    0,
    Math.PI * 2,
    RING_SCALE_STROKE_HOVER,
    strokeWidth,
  );
}

function queueDottedArc(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  radius: number,
  stroke: Color,
  strokeWidth: number,
  dashLength: number,
  gapLength: number,
): void {
  const circumference = Math.PI * 2 * radius;
  const period = dashLength + gapLength;

  if (circumference <= 0 || period <= 0) {
    return;
  }

  const dashAngle = (dashLength / circumference) * Math.PI * 2;
  const gapAngle = (gapLength / circumference) * Math.PI * 2;
  const stepAngle = dashAngle + gapAngle;

  let angle = 0;
  while (angle < Math.PI * 2) {
    const dashStart = angle;
    const dashEnd = Math.min(angle + dashAngle, Math.PI * 2);

    queueArc(queue, frameAllocator, centerX, centerY, radius, dashStart, dashEnd, stroke, strokeWidth);
    angle += stepAngle;
  }
}

function rotateLocalPoint(
  localX: number,
  localY: number,
  centerX: number,
  centerY: number,
  cosRotation: number,
  sinRotation: number,
): [number, number] {
  return [
    centerX + localX * cosRotation - localY * sinRotation,
    centerY + localX * sinRotation + localY * cosRotation,
  ];
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
