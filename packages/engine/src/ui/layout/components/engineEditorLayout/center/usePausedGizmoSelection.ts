import { EditorDebugEntity } from "@ui/layout/sidebar/worldViewer/editorDebugEntity";
import type { EngineUiContextValue } from "@ui/utilities/engine-context";
import { useEffect } from "react";
import { Gizmo, Transform2D } from "@/components";
import type { EntityId } from "@/ecs/entity";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const PICK_RADIUS_PIXELS = 18;
const AXIS_LENGTH_PIXELS = 48;
const AXIS_HIT_THICKNESS_PIXELS = 14;
const RING_RADIUS_PIXELS = 64;
const RING_HIT_THICKNESS_PIXELS = 14;

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DragState =
  | {
      mode: "move";
      entityId: EntityId;
      axisX: number;
      axisY: number;
      startEntityX: number;
      startEntityY: number;
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

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function usePausedGizmoSelection(engine: EngineUiContextValue): void {
  useEffect(() => {
    let dragState: DragState | null = null;

    const toWorldPoint = (event: PointerEvent): { worldX: number; worldY: number; cameraZoom: number } => {
      const canvas = engine.canvas;
      const viewport = canvas.getBoundingClientRect();
      const cameraX = engine.editor.camera.x;
      const cameraY = engine.editor.camera.y;
      const cameraZoom = engine.editor.camera.zoom;

      const worldX = (event.clientX - viewport.left - viewport.width / 2) / cameraZoom + cameraX;
      const worldY = (event.clientY - viewport.top - viewport.height / 2) / cameraZoom + cameraY;

      return { worldX, worldY, cameraZoom };
    };

    const getGizmoEntity = (): EntityId | null => {
      const world = engine.scene.world;

      for (const entityId of world.query(Gizmo, Transform2D)) {
        return entityId;
      }

      return null;
    };

    const tryBeginGizmoDrag = (event: PointerEvent): boolean => {
      const world = engine.scene.world;
      const gizmoEntityId = getGizmoEntity();

      if (gizmoEntityId === null) {
        return false;
      }

      const transform = world.get(gizmoEntityId, Transform2D);
      if (!transform) {
        return false;
      }

      const { worldX, worldY, cameraZoom } = toWorldPoint(event);
      const centerX = transform.curr.pos.x;
      const centerY = transform.curr.pos.y;

      const axisLength = AXIS_LENGTH_PIXELS / cameraZoom;
      const axisHitThickness = AXIS_HIT_THICKNESS_PIXELS / cameraZoom;
      const ringRadius = RING_RADIUS_PIXELS / cameraZoom;
      const ringHitThickness = RING_HIT_THICKNESS_PIXELS / cameraZoom;

      const axisXDistance = distanceToSegment(worldX, worldY, centerX, centerY, centerX + axisLength, centerY);
      if (axisXDistance <= axisHitThickness) {
        dragState = {
          mode: "move",
          entityId: gizmoEntityId,
          axisX: 1,
          axisY: 0,
          startEntityX: centerX,
          startEntityY: centerY,
          startPointerX: worldX,
          startPointerY: worldY,
          pointerId: event.pointerId,
        };

        return true;
      }

      const axisYDistance = distanceToSegment(worldX, worldY, centerX, centerY, centerX, centerY - axisLength);
      if (axisYDistance <= axisHitThickness) {
        dragState = {
          mode: "move",
          entityId: gizmoEntityId,
          axisX: 0,
          axisY: -1,
          startEntityX: centerX,
          startEntityY: centerY,
          startPointerX: worldX,
          startPointerY: worldY,
          pointerId: event.pointerId,
        };

        return true;
      }

      const distanceFromCenter = Math.hypot(worldX - centerX, worldY - centerY);
      if (Math.abs(distanceFromCenter - ringRadius) <= ringHitThickness) {
        dragState = {
          mode: "rotate",
          entityId: gizmoEntityId,
          startRotation: transform.curr.rotation,
          startPointerAngle: Math.atan2(worldY - centerY, worldX - centerX),
          pointerId: event.pointerId,
        };

        return true;
      }

      return false;
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      const world = engine.scene.world;
      const transform = world.get(dragState.entityId, Transform2D);
      if (!transform) {
        return;
      }

      const { worldX, worldY } = toWorldPoint(event);

      if (dragState.mode === "move") {
        const deltaX = worldX - dragState.startPointerX;
        const deltaY = worldY - dragState.startPointerY;
        const projected = deltaX * dragState.axisX + deltaY * dragState.axisY;

        const nextX = dragState.startEntityX + dragState.axisX * projected;
        const nextY = dragState.startEntityY + dragState.axisY * projected;

        transform.curr.pos.set(nextX, nextY);
        transform.prev.pos.set(nextX, nextY);
        return;
      }

      const centerX = transform.curr.pos.x;
      const centerY = transform.curr.pos.y;
      const angle = Math.atan2(worldY - centerY, worldX - centerX);
      const nextRotation = dragState.startRotation + (angle - dragState.startPointerAngle);

      transform.curr.rotation = nextRotation;
      transform.prev.rotation = nextRotation;
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      dragState = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !engine.editor.runningState.paused) {
        return;
      }

      if (engine.editor.camera.mode !== "engine") {
        return;
      }

      if (tryBeginGizmoDrag(event)) {
        event.preventDefault();
        return;
      }

      if (!event.altKey) {
        return;
      }

      const world = engine.scene.world;
      const { worldX, worldY, cameraZoom } = toWorldPoint(event);
      const maxDistance = PICK_RADIUS_PIXELS / cameraZoom;
      const maxDistanceSquared = maxDistance * maxDistance;

      let nearestEntityId: EntityId | null = null;
      let nearestDistanceSquared = maxDistanceSquared;

      for (const entityId of world.query(Transform2D)) {
        if (world.has(entityId, EditorDebugEntity)) {
          continue;
        }

        const transform = world.get(entityId, Transform2D);
        if (!transform) {
          continue;
        }

        const deltaX = transform.curr.pos.x - worldX;
        const deltaY = transform.curr.pos.y - worldY;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;

        if (distanceSquared > nearestDistanceSquared) {
          continue;
        }

        nearestDistanceSquared = distanceSquared;
        nearestEntityId = entityId;
      }

      if (nearestEntityId === null) {
        return;
      }

      for (const [, worldEntry] of engine.scene.context.worldEntries) {
        for (const gizmoEntityId of worldEntry.query(Gizmo)) {
          worldEntry.remove(gizmoEntityId, Gizmo);
        }
      }

      world.add(nearestEntityId, Gizmo, new Gizmo());
    };

    const canvas = engine.canvas;
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [engine]);
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