import {
  Gizmo,
  GIZMO_AXIS_HIT_THICKNESS_WORLD,
  GIZMO_AXIS_LENGTH_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_X_WORLD,
  GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD,
  GIZMO_PLANE_HANDLE_SIZE_WORLD,
  GIZMO_RING_HIT_THICKNESS_WORLD,
  GIZMO_RING_RADIUS_WORLD,
  GIZMO_ROTATE_RING_RADIUS_WORLD,
  GIZMO_SCALE_MIN_DISTANCE_WORLD,
  Transform2D,
  type GizmoHandle,
} from "@components";
import { EngineEditorGizmoManager } from "@core/engine-editor/gizmo-manager";
import type { EngineInput, EngineKeyboardEvent, EngineMouseEvent } from "@core/input";
import type { EntityId } from "@ecs/entity";
import { resolveWorldTransform2D } from "@ecs/hierarchy";
import type { UserWorld } from "@ecs/world";

const PICK_RADIUS_PIXELS = 18;

type GizmoInputManagerOptions = {
  input: EngineInput;
  getWorld: () => UserWorld;
  gizmo: EngineEditorGizmoManager;
};

type DragState =
  | {
      mode: "move";
      entityId: EntityId;
      axisX: number;
      axisY: number;
      startEntityLocalX: number;
      startEntityLocalY: number;
      startPointerX: number;
      startPointerY: number;
      pointerId: number;
    }
  | {
      mode: "move-plane";
      entityId: EntityId;
      startEntityLocalX: number;
      startEntityLocalY: number;
      startPointerX: number;
      startPointerY: number;
      pointerId: number;
    }
  | {
      mode: "rotate";
      entityId: EntityId;
      startRotation: number;
      startPointerAngle: number;
      pointerId: number;
    }
  | {
      mode: "scale";
      entityId: EntityId;
      startPointerDistance: number;
      startScaleX: number;
      startScaleY: number;
      pointerId: number;
    };

export class GizmoInputManager {
  readonly #input: EngineInput;
  readonly #getWorld: () => UserWorld;
  readonly #gizmo: EngineEditorGizmoManager;

  readonly #SHARED_TRANSFORM2D = new Transform2D();
  readonly #unsubscribers: Array<() => void> = [];

  #dragState: DragState | null = null;
  #listening = false;

  public constructor(options: GizmoInputManagerOptions) {
    this.#input = options.input;
    this.#getWorld = options.getWorld;
    this.#gizmo = options.gizmo;
  }

  public listen(): void {
    if (this.#listening) {
      return;
    }

    this.#unsubscribers.push(
      this.#input.addEventListener({
        event: "mouseDown",
        callback: (event) => this.#onMouseDown(event),
      }),
      this.#input.addEventListener({
        event: "mouseMove",
        callback: (event) => this.#onMouseMove(event),
      }),
      this.#input.addEventListener({
        event: "mouseUp",
        callback: (event) => this.#onMouseUp(event),
      }),
      this.#input.addEventListener({
        event: "mouseCancel",
        callback: (event) => this.#onMouseUp(event),
      }),
      this.#input.addEventListener({
        event: { code: "Escape", modifiers: {} },
        callback: (event: EngineKeyboardEvent) => this.#onEscape(event),
      }),
    );

    this.#listening = true;
  }

  public unlisten(): void {
    if (!this.#listening) {
      return;
    }

    for (const unsubscribe of this.#unsubscribers) {
      unsubscribe();
    }
    this.#unsubscribers.length = 0;

    if (this.#dragState) {
      this.#gizmo.setHoveredHandle(this.#dragState.entityId, null);
      this.#gizmo.setActiveHandle(this.#dragState.entityId, null);
      this.#dragState = null;
    }

    const currentEntityId = this.#gizmo.currentEntityId();
    if (currentEntityId !== null) {
      this.#gizmo.setHoveredHandle(currentEntityId, null);
    }

    this.#listening = false;
  }

  public get listening(): boolean {
    return this.#listening;
  }

  #onMouseDown(event: EngineMouseEvent): void {
    if (event.button !== 0) {
      return;
    }

    if (this.#tryBeginGizmoDrag(event)) {
      event.preventDefault();
      return;
    }

    const nearestEntityId = event.entityAtPoint(PICK_RADIUS_PIXELS, this.#getWorld());
    if (nearestEntityId === null) {
      this.#gizmo.clear();
      return;
    }

    this.#gizmo.create(nearestEntityId);
  }

  #onEscape(event: EngineKeyboardEvent): void {
    event.preventDefault();

    if (this.#dragState) {
      const world = this.#getWorld();
      const gizmo = world.get(this.#dragState.entityId, Gizmo);
      if (gizmo) {
        gizmo.clearInteractionPreview();
      }

      this.#gizmo.setHoveredHandle(this.#dragState.entityId, null);
      this.#gizmo.setActiveHandle(this.#dragState.entityId, null);
      this.#dragState = null;
    }

    this.#gizmo.clear();
  }

  #onMouseMove(event: EngineMouseEvent): void {
    if (!this.#dragState || event.pointerId !== this.#dragState.pointerId) {
      this.#updateHoveredHandle(event);
      return;
    }

    const world = this.#getWorld();
    const transform = world.get(this.#dragState.entityId, Transform2D);
    if (!transform) {
      return;
    }

    const worldX = event.worldX;
    const worldY = event.worldY;

    if (this.#dragState.mode === "move") {
      const deltaX = worldX - this.#dragState.startPointerX;
      const deltaY = worldY - this.#dragState.startPointerY;
      const projected = deltaX * this.#dragState.axisX + deltaY * this.#dragState.axisY;

      const nextX = this.#dragState.startEntityLocalX + this.#dragState.axisX * projected;
      const nextY = this.#dragState.startEntityLocalY + this.#dragState.axisY * projected;

      transform.curr.pos.set(nextX, nextY);
      transform.prev.pos.set(nextX, nextY);
      this.#updateHoveredHandle(event);
      return;
    }

    if (this.#dragState.mode === "move-plane") {
      const deltaX = worldX - this.#dragState.startPointerX;
      const deltaY = worldY - this.#dragState.startPointerY;

      const nextX = this.#dragState.startEntityLocalX + deltaX;
      const nextY = this.#dragState.startEntityLocalY + deltaY;

      transform.curr.pos.set(nextX, nextY);
      transform.prev.pos.set(nextX, nextY);
      this.#updateHoveredHandle(event);
      return;
    }

    if (!resolveWorldTransform2D(world, this.#dragState.entityId, this.#SHARED_TRANSFORM2D)) {
      return;
    }

    const centerX = this.#SHARED_TRANSFORM2D.curr.pos.x;
    const centerY = this.#SHARED_TRANSFORM2D.curr.pos.y;

    if (this.#dragState.mode === "rotate") {
      const angle = Math.atan2(worldY - centerY, worldX - centerX);
      const rotationDelta = angle - this.#dragState.startPointerAngle;
      const nextRotation = this.#dragState.startRotation + rotationDelta;

      transform.curr.rotation = nextRotation;
      transform.prev.rotation = nextRotation;

      const gizmo = world.get(this.#dragState.entityId, Gizmo);
      if (gizmo && gizmo.rotateStartDeltaX !== null && gizmo.rotateStartDeltaY !== null) {
        const cosDelta = Math.cos(rotationDelta);
        const sinDelta = Math.sin(rotationDelta);
        gizmo.rotateCurrentDeltaX = gizmo.rotateStartDeltaX * cosDelta - gizmo.rotateStartDeltaY * sinDelta;
        gizmo.rotateCurrentDeltaY = gizmo.rotateStartDeltaX * sinDelta + gizmo.rotateStartDeltaY * cosDelta;
        gizmo.rotateAngleDelta = rotationDelta;
      }

      this.#updateHoveredHandle(event);
      return;
    }

    const currentDistance = Math.hypot(worldX - centerX, worldY - centerY);
    const safeStartDistance = Math.max(this.#dragState.startPointerDistance, GIZMO_SCALE_MIN_DISTANCE_WORLD);
    const scaleFactor = Math.max(currentDistance, GIZMO_SCALE_MIN_DISTANCE_WORLD) / safeStartDistance;

    const nextScaleX = this.#dragState.startScaleX * scaleFactor;
    const nextScaleY = this.#dragState.startScaleY * scaleFactor;

    transform.curr.scale.set(nextScaleX, nextScaleY);
    transform.prev.scale.set(nextScaleX, nextScaleY);

    const gizmo = world.get(this.#dragState.entityId, Gizmo);
    if (gizmo) {
      gizmo.scaleCurrentDistance = Math.max(currentDistance, GIZMO_SCALE_MIN_DISTANCE_WORLD);
    }

    this.#updateHoveredHandle(event);
  }

  #onMouseUp(event: EngineMouseEvent): void {
    if (!this.#dragState || event.pointerId !== this.#dragState.pointerId) {
      return;
    }

    const world = this.#getWorld();
    const gizmo = world.get(this.#dragState.entityId, Gizmo);
    if (gizmo) {
      gizmo.clearInteractionPreview();
    }

    this.#gizmo.setHoveredHandle(this.#dragState.entityId, null);
    this.#gizmo.setActiveHandle(this.#dragState.entityId, null);
    this.#dragState = null;
  }

  #updateHoveredHandle(event: EngineMouseEvent): void {
    const world = this.#getWorld();
    const gizmoEntityId = this.#gizmo.currentEntityId();
    if (gizmoEntityId === null) {
      return;
    }

    if (!resolveWorldTransform2D(world, gizmoEntityId, this.#SHARED_TRANSFORM2D)) {
      return;
    }

    const handle = this.#getHandleAtPoint(
      event.worldX,
      event.worldY,
      this.#SHARED_TRANSFORM2D.curr.pos.x,
      this.#SHARED_TRANSFORM2D.curr.pos.y,
      this.#SHARED_TRANSFORM2D.curr.rotation,
    );

    this.#gizmo.setHoveredHandle(gizmoEntityId, handle);
  }

  #tryBeginGizmoDrag(event: EngineMouseEvent): boolean {
    const world = this.#getWorld();
    const gizmoEntityId = this.#gizmo.currentEntityId();
    if (gizmoEntityId === null) {
      return false;
    }

    const transform = world.require(gizmoEntityId, Transform2D);
    const gizmo = world.require(gizmoEntityId, Gizmo);

    if (!resolveWorldTransform2D(world, gizmoEntityId, this.#SHARED_TRANSFORM2D)) {
      return false;
    }

    const centerX = this.#SHARED_TRANSFORM2D.curr.pos.x;
    const centerY = this.#SHARED_TRANSFORM2D.curr.pos.y;
    const worldRotation = this.#SHARED_TRANSFORM2D.curr.rotation;

    const handle = this.#getHandleAtPoint(event.worldX, event.worldY, centerX, centerY, worldRotation);
    if (handle === "plane-xy") {
      this.#dragState = {
        mode: "move-plane",
        entityId: gizmoEntityId,
        startEntityLocalX: transform.curr.pos.x,
        startEntityLocalY: transform.curr.pos.y,
        startPointerX: event.worldX,
        startPointerY: event.worldY,
        pointerId: event.pointerId,
      };

      gizmo.hoveredHandle = "plane-xy";
      this.#gizmo.setActiveHandle(gizmoEntityId, "plane-xy");
      return true;
    }

    if (handle === "axis-x") {
      const axisX = Math.cos(worldRotation);
      const axisY = Math.sin(worldRotation);

      this.#dragState = {
        mode: "move",
        entityId: gizmoEntityId,
        axisX,
        axisY,
        startEntityLocalX: transform.curr.pos.x,
        startEntityLocalY: transform.curr.pos.y,
        startPointerX: event.worldX,
        startPointerY: event.worldY,
        pointerId: event.pointerId,
      };

      gizmo.hoveredHandle = "axis-x";
      this.#gizmo.setActiveHandle(gizmoEntityId, "axis-x");
      return true;
    }

    if (handle === "axis-y") {
      const axisX = Math.sin(worldRotation);
      const axisY = -Math.cos(worldRotation);

      this.#dragState = {
        mode: "move",
        entityId: gizmoEntityId,
        axisX,
        axisY,
        startEntityLocalX: transform.curr.pos.x,
        startEntityLocalY: transform.curr.pos.y,
        startPointerX: event.worldX,
        startPointerY: event.worldY,
        pointerId: event.pointerId,
      };

      gizmo.hoveredHandle = "axis-y";
      this.#gizmo.setActiveHandle(gizmoEntityId, "axis-y");
      return true;
    }

    if (handle === "ring-rotate") {
      const clickAngle = Math.atan2(event.worldY - centerY, event.worldX - centerX);
      const startDeltaX = Math.cos(clickAngle) * GIZMO_ROTATE_RING_RADIUS_WORLD;
      const startDeltaY = Math.sin(clickAngle) * GIZMO_ROTATE_RING_RADIUS_WORLD;

      this.#dragState = {
        mode: "rotate",
        entityId: gizmoEntityId,
        startRotation: transform.curr.rotation,
        startPointerAngle: clickAngle,
        pointerId: event.pointerId,
      };

      gizmo.rotateStartDeltaX = startDeltaX;
      gizmo.rotateStartDeltaY = startDeltaY;
      gizmo.rotateCurrentDeltaX = startDeltaX;
      gizmo.rotateCurrentDeltaY = startDeltaY;
      gizmo.rotateAngleDelta = 0;
      gizmo.hoveredHandle = "ring-rotate";
      this.#gizmo.setActiveHandle(gizmoEntityId, "ring-rotate");
      return true;
    }

    if (handle === "ring-scale") {
      const startPointerDistance = Math.max(
        Math.hypot(event.worldX - centerX, event.worldY - centerY),
        GIZMO_SCALE_MIN_DISTANCE_WORLD,
      );

      this.#dragState = {
        mode: "scale",
        entityId: gizmoEntityId,
        startPointerDistance,
        startScaleX: transform.curr.scale.x,
        startScaleY: transform.curr.scale.y,
        pointerId: event.pointerId,
      };

      gizmo.clearRotatePreview();
      gizmo.scaleStartDistance = startPointerDistance;
      gizmo.scaleCurrentDistance = startPointerDistance;
      gizmo.hoveredHandle = "ring-scale";
      this.#gizmo.setActiveHandle(gizmoEntityId, "ring-scale");
      return true;
    }

    return false;
  }

  #getHandleAtPoint(
    worldX: number,
    worldY: number,
    centerX: number,
    centerY: number,
    worldRotation: number,
  ): GizmoHandle | null {
    const axisLength = GIZMO_AXIS_LENGTH_WORLD;
    const axisHitThickness = GIZMO_AXIS_HIT_THICKNESS_WORLD;
    const ringScaleRadius = GIZMO_RING_RADIUS_WORLD;
    const ringRotateRadius = GIZMO_ROTATE_RING_RADIUS_WORLD;
    const ringHitThickness = GIZMO_RING_HIT_THICKNESS_WORLD;
    const planeHalfSize = GIZMO_PLANE_HANDLE_SIZE_WORLD * 0.5;

    const cosRotation = Math.cos(worldRotation);
    const sinRotation = Math.sin(worldRotation);

    const planeOffsetX =
      GIZMO_PLANE_HANDLE_OFFSET_X_WORLD * cosRotation - GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD * sinRotation;
    const planeOffsetY =
      GIZMO_PLANE_HANDLE_OFFSET_X_WORLD * sinRotation + GIZMO_PLANE_HANDLE_OFFSET_Y_WORLD * cosRotation;

    const planeCenterX = centerX + planeOffsetX;
    const planeCenterY = centerY + planeOffsetY;

    const planeDeltaX = worldX - planeCenterX;
    const planeDeltaY = worldY - planeCenterY;
    const planeLocalX = planeDeltaX * cosRotation + planeDeltaY * sinRotation;
    const planeLocalY = planeDeltaX * sinRotation - planeDeltaY * cosRotation;

    if (
      planeLocalX >= -planeHalfSize
      && planeLocalX <= planeHalfSize
      && planeLocalY >= -planeHalfSize
      && planeLocalY <= planeHalfSize
    ) {
      return "plane-xy";
    }

    const axisXDistance = distanceToSegment(
      worldX,
      worldY,
      centerX,
      centerY,
      centerX + Math.cos(worldRotation) * axisLength,
      centerY + Math.sin(worldRotation) * axisLength,
    );
    if (axisXDistance <= axisHitThickness) {
      return "axis-x";
    }

    const axisYDistance = distanceToSegment(
      worldX,
      worldY,
      centerX,
      centerY,
      centerX + Math.sin(worldRotation) * axisLength,
      centerY - Math.cos(worldRotation) * axisLength,
    );
    if (axisYDistance <= axisHitThickness) {
      return "axis-y";
    }

    const deltaX = worldX - centerX;
    const deltaY = worldY - centerY;
    const localDeltaX = deltaX * cosRotation + deltaY * sinRotation;
    const localDeltaY = deltaX * sinRotation - deltaY * cosRotation;
    const isRotateQuadrant = localDeltaX >= 0 && localDeltaY >= 0;
    const distanceFromCenter = Math.hypot(deltaX, deltaY);

    if (isRotateQuadrant && Math.abs(distanceFromCenter - ringRotateRadius) <= ringHitThickness) {
      return "ring-rotate";
    }

    if (Math.abs(distanceFromCenter - ringScaleRadius) <= ringHitThickness) {
      return "ring-scale";
    }

    return null;
  }
}

function distanceToSegment(
  pointX: number,
  pointY: number,
  segmentStartX: number,
  segmentStartY: number,
  segmentEndX: number,
  segmentEndY: number,
): number {
  const segmentX = segmentEndX - segmentStartX;
  const segmentY = segmentEndY - segmentStartY;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared <= 0) {
    return Math.hypot(pointX - segmentStartX, pointY - segmentStartY);
  }

  const projection = ((pointX - segmentStartX) * segmentX + (pointY - segmentStartY) * segmentY) /
    segmentLengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));

  const nearestX = segmentStartX + segmentX * clampedProjection;
  const nearestY = segmentStartY + segmentY * clampedProjection;

  return Math.hypot(pointX - nearestX, pointY - nearestY);
}