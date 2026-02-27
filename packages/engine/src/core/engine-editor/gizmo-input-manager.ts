import { Gizmo, Transform2D, type GizmoHandle } from "../../components";
import type { EntityId } from "../../ecs/entity";
import { resolveWorldTransform2D } from "../../ecs/hierarchy";
import type { UserWorld } from "../../ecs/world";
import type { EngineCamera } from "../engine-camera";
import type { EngineInput, EngineMouseEvent } from "../input";
import { EngineEditorGizmoManager } from "./gizmo-manager";

const PICK_RADIUS_PIXELS = 18;
const AXIS_LENGTH_PIXELS = 48;
const AXIS_HIT_THICKNESS_PIXELS = 14;
const RING_RADIUS_PIXELS = 64;
const RING_HIT_THICKNESS_PIXELS = 14;

type GizmoInputManagerOptions = {
  input: EngineInput;
  getWorld: () => UserWorld;
  camera: EngineCamera;
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
      mode: "rotate";
      entityId: EntityId;
      startRotation: number;
      startPointerAngle: number;
      pointerId: number;
    };

export class GizmoInputManager {
  readonly #input: EngineInput;
  readonly #getWorld: () => UserWorld;
  readonly #camera: EngineCamera;
  readonly #gizmo: EngineEditorGizmoManager;

  readonly #SHARED_TRANSFORM2D = new Transform2D();
  readonly #unsubscribers: Array<() => void> = [];

  #dragState: DragState | null = null;
  #listening = false;

  public constructor(options: GizmoInputManagerOptions) {
    this.#input = options.input;
    this.#getWorld = options.getWorld;
    this.#camera = options.camera;
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

    if (this.#camera.mode !== "engine") {
      return;
    }

    if (this.#tryBeginGizmoDrag(event)) {
      event.preventDefault();
      return;
    }

    if (!event.altKey) {
      return;
    }

    const nearestEntityId = event.entityAtPoint(PICK_RADIUS_PIXELS, this.#getWorld());
    if (nearestEntityId === null) {
      return;
    }

    this.#gizmo.create(nearestEntityId);
  }

  #onMouseMove(event: EngineMouseEvent): void {
    if (this.#camera.mode !== "engine") {
      return;
    }

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

    if (!resolveWorldTransform2D(world, this.#dragState.entityId, this.#SHARED_TRANSFORM2D)) {
      return;
    }

    const centerX = this.#SHARED_TRANSFORM2D.curr.pos.x;
    const centerY = this.#SHARED_TRANSFORM2D.curr.pos.y;
    const angle = Math.atan2(worldY - centerY, worldX - centerX);
    const nextRotation = this.#dragState.startRotation + (angle - this.#dragState.startPointerAngle);

    transform.curr.rotation = nextRotation;
    transform.prev.rotation = nextRotation;
    this.#updateHoveredHandle(event);
  }

  #onMouseUp(event: EngineMouseEvent): void {
    if (!this.#dragState || event.pointerId !== this.#dragState.pointerId) {
      return;
    }

    this.#gizmo.setHoveredHandle(this.#dragState.entityId, null);
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
      this.#camera.zoom,
    );

    this.#gizmo.setHoveredHandle(gizmoEntityId, handle);
  }

  #tryBeginGizmoDrag(event: EngineMouseEvent): boolean {
    const world = this.#getWorld();
    const gizmoEntityId = this.#gizmo.currentEntityId();
    if (gizmoEntityId === null) {
      return false;
    }

    const transform = world.get(gizmoEntityId, Transform2D);
    const gizmo = world.get(gizmoEntityId, Gizmo);
    if (!transform || !gizmo) {
      return false;
    }

    if (!resolveWorldTransform2D(world, gizmoEntityId, this.#SHARED_TRANSFORM2D)) {
      return false;
    }

    const centerX = this.#SHARED_TRANSFORM2D.curr.pos.x;
    const centerY = this.#SHARED_TRANSFORM2D.curr.pos.y;

    const handle = this.#getHandleAtPoint(event.worldX, event.worldY, centerX, centerY, this.#camera.zoom);
    if (handle === "axis-x") {
      this.#dragState = {
        mode: "move",
        entityId: gizmoEntityId,
        axisX: 1,
        axisY: 0,
        startEntityLocalX: transform.curr.pos.x,
        startEntityLocalY: transform.curr.pos.y,
        startPointerX: event.worldX,
        startPointerY: event.worldY,
        pointerId: event.pointerId,
      };

      gizmo.hoveredHandle = "axis-x";
      return true;
    }

    if (handle === "axis-y") {
      this.#dragState = {
        mode: "move",
        entityId: gizmoEntityId,
        axisX: 0,
        axisY: -1,
        startEntityLocalX: transform.curr.pos.x,
        startEntityLocalY: transform.curr.pos.y,
        startPointerX: event.worldX,
        startPointerY: event.worldY,
        pointerId: event.pointerId,
      };

      gizmo.hoveredHandle = "axis-y";
      return true;
    }

    if (handle === "ring") {
      this.#dragState = {
        mode: "rotate",
        entityId: gizmoEntityId,
        startRotation: transform.curr.rotation,
        startPointerAngle: Math.atan2(event.worldY - centerY, event.worldX - centerX),
        pointerId: event.pointerId,
      };

      gizmo.hoveredHandle = "ring";
      return true;
    }

    return false;
  }

  #getHandleAtPoint(
    worldX: number,
    worldY: number,
    centerX: number,
    centerY: number,
    cameraZoom: number,
  ): GizmoHandle | null {
    const axisLength = AXIS_LENGTH_PIXELS / cameraZoom;
    const axisHitThickness = AXIS_HIT_THICKNESS_PIXELS / cameraZoom;
    const ringRadius = RING_RADIUS_PIXELS / cameraZoom;
    const ringHitThickness = RING_HIT_THICKNESS_PIXELS / cameraZoom;

    const axisXDistance = distanceToSegment(worldX, worldY, centerX, centerY, centerX + axisLength, centerY);
    if (axisXDistance <= axisHitThickness) {
      return "axis-x";
    }

    const axisYDistance = distanceToSegment(worldX, worldY, centerX, centerY, centerX, centerY - axisLength);
    if (axisYDistance <= axisHitThickness) {
      return "axis-y";
    }

    const distanceFromCenter = Math.hypot(worldX - centerX, worldY - centerY);
    if (Math.abs(distanceFromCenter - ringRadius) <= ringHitThickness) {
      return "ring";
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