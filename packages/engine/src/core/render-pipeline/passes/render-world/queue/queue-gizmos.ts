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
const ROTATE_DASH_LENGTH_SCREEN = 8;
const ROTATE_GAP_LENGTH_SCREEN = 6;
const SCALE_DASH_LENGTH_SCREEN = 6;
const SCALE_GAP_LENGTH_SCREEN = 6;
const SCALE_PREVIEW_FILL_ALPHA = 0.3;
const ROTATE_PREVIEW_FILL_ALPHA = 0.2;
const MIN_DONUT_THICKNESS_WORLD = 0.25;
const INACTIVE_HANDLE_ALPHA = 0.2;

const RING_SEGMENTS = 48;
const FULL_ARC = Math.PI * 2;

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
const ROTATE_PREVIEW_FILL = new Color(0.3, 0.6, 1, ROTATE_PREVIEW_FILL_ALPHA);

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
  if (!import.meta.env.DEV) {
    const half = size * 0.5;
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);

    const topLeftX = centerX + (-half * cosRotation - -half * sinRotation);
    const topLeftY = centerY + (-half * sinRotation + -half * cosRotation);
    const topRightX = centerX + (half * cosRotation - -half * sinRotation);
    const topRightY = centerY + (half * sinRotation + -half * cosRotation);
    const bottomRightX = centerX + (half * cosRotation - half * sinRotation);
    const bottomRightY = centerY + (half * sinRotation + half * cosRotation);
    const bottomLeftX = centerX + (-half * cosRotation - half * sinRotation);
    const bottomLeftY = centerY + (-half * sinRotation + half * cosRotation);

    queueLine(queue, frameAllocator, topLeftX, topLeftY, topRightX, topRightY, stroke, strokeWidth);
    queueLine(queue, frameAllocator, topRightX, topRightY, bottomRightX, bottomRightY, stroke, strokeWidth);
    queueLine(queue, frameAllocator, bottomRightX, bottomRightY, bottomLeftX, bottomLeftY, stroke, strokeWidth);
    queueLine(queue, frameAllocator, bottomLeftX, bottomLeftY, topLeftX, topLeftY, stroke, strokeWidth);
    return;
  }

  const cornerRadius = size * PLANE_CORNER_RADIUS_RATIO;

  queueRoundedRectangle(
    queue,
    frameAllocator,
    centerX,
    centerY,
    size,
    size,
    rotation,
    TRANSPARENT_FILL,
    stroke,
    strokeWidth,
    cornerRadius,
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

  queueCircle(
    queue,
    frameAllocator,
    endX,
    endY,
    Math.max(strokeWidth * 1.1, 0.001),
    stroke,
    null,
    0,
    false,
    false,
    0,
    FULL_ARC,
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
  const scaleStroke = resolveHandleStroke(
    hoveredHandle === "ring-scale" ? RING_SCALE_STROKE_HOVER : RING_SCALE_STROKE,
    activeHandle,
    "ring-scale",
  );

  queueCircle(
    queue,
    frameAllocator,
    centerX,
    centerY,
    scaleRingRadius * 2,
    TRANSPARENT_FILL,
    scaleStroke,
    strokeWidth,
    false,
    false,
    0,
    FULL_ARC,
  );

  const rotateStroke = resolveHandleStroke(
    hoveredHandle === "ring-rotate" ? RING_ROTATE_STROKE_HOVER : RING_ROTATE_STROKE,
    activeHandle,
    "ring-rotate",
  );

  queueCircle(
    queue,
    frameAllocator,
    centerX,
    centerY,
    rotateRingRadius * 2,
    TRANSPARENT_FILL,
    rotateStroke,
    strokeWidth,
    false,
    true,
    rotation,
    rotation - Math.PI * 0.5,
  );
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
  queueCircle(
    queue,
    frameAllocator,
    centerX,
    centerY,
    radius * 2,
    ROTATE_PREVIEW_FILL,
    RING_ROTATE_STROKE_HOVER,
    strokeWidth,
    true,
    true,
    startAngle,
    startAngle + gizmo.rotateAngleDelta,
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
    queueCircle(
      queue,
      frameAllocator,
      centerX,
      centerY,
      outerRadius * 2,
      SCALE_PREVIEW_FILL,
      SCALE_PREVIEW_FILL,
      donutThickness,
      false,
      false,
      0,
      FULL_ARC,
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

  queueCircle(
    queue,
    frameAllocator,
    centerX,
    centerY,
    currentRadius * 2,
    TRANSPARENT_FILL,
    RING_SCALE_STROKE_HOVER,
    strokeWidth,
    false,
    false,
    0,
    FULL_ARC,
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

function queueCircle(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  diameter: number,
  fill: Color,
  stroke: Color | null,
  strokeWidth: number,
  fillEnabled: boolean,
  arcEnabled: boolean,
  arcStart: number,
  arcEnd: number,
): void {
  const shape = frameAllocator.acquire("engine:shape-command");
  writeCircleShape(
    shape,
    centerX,
    centerY,
    diameter,
    fill,
    stroke,
    strokeWidth,
    fillEnabled,
    arcEnabled,
    arcStart,
    arcEnd,
  );

  const command = frameAllocator.acquire("engine:render-command");
  command.type = "shape-draw";
  command.world = null;
  command.entityId = null;
  command.shape = shape;
  command.layer = GIZMO_LAYER;
  command.zOrder = GIZMO_Z_ORDER;

  queue.add(command);
}

function queueRoundedRectangle(
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation: number,
  fill: Color,
  stroke: Color | null,
  strokeWidth: number,
  cornerRadius: number,
): void {
  const shape = frameAllocator.acquire("engine:shape-command");
  writeRoundedRectangleShape(
    shape,
    centerX,
    centerY,
    width,
    height,
    rotation,
    fill,
    stroke,
    strokeWidth,
    cornerRadius,
  );

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
  shape.fillEnabled = false;
  shape.arcEnabled = false;
  shape.arcStart = 0;
  shape.arcEnd = FULL_ARC;
  shape.cornerRadius = 0;
}

function writeCircleShape(
  shape: ShapeRenderData,
  centerX: number,
  centerY: number,
  diameter: number,
  fill: Color,
  stroke: Color | null,
  strokeWidth: number,
  fillEnabled: boolean,
  arcEnabled: boolean,
  arcStart: number,
  arcEnd: number,
): void {
  const normalizedArcStart = arcEnabled ? -arcStart : arcStart;
  const normalizedArcEnd = arcEnabled ? -arcEnd : arcEnd;

  shape.type = "circle";
  shape.x = centerX;
  shape.y = centerY;
  shape.width = diameter;
  shape.height = diameter;
  shape.rotation = 0;
  shape.scaleX = 1;
  shape.scaleY = 1;
  shape.fill.r = fill.r;
  shape.fill.g = fill.g;
  shape.fill.b = fill.b;
  shape.fill.a = fill.a;
  shape.stroke = stroke;
  shape.strokeWidth = strokeWidth;
  shape.fillEnabled = fillEnabled;
  shape.arcEnabled = arcEnabled;
  shape.arcStart = normalizedArcStart;
  shape.arcEnd = normalizedArcEnd;
  shape.cornerRadius = 0;
}

function writeRoundedRectangleShape(
  shape: ShapeRenderData,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation: number,
  fill: Color,
  stroke: Color | null,
  strokeWidth: number,
  cornerRadius: number,
): void {
  shape.type = "rounded-rectangle";
  shape.x = centerX;
  shape.y = centerY;
  shape.width = width;
  shape.height = height;
  shape.rotation = rotation;
  shape.scaleX = 1;
  shape.scaleY = 1;
  shape.fill.r = fill.r;
  shape.fill.g = fill.g;
  shape.fill.b = fill.b;
  shape.fill.a = fill.a;
  shape.stroke = stroke;
  shape.strokeWidth = strokeWidth;
  shape.fillEnabled = fill.a > 0;
  shape.arcEnabled = false;
  shape.arcStart = 0;
  shape.arcEnd = FULL_ARC;
  shape.cornerRadius = cornerRadius;
}
