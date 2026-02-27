import { EditorDebugEntity } from "@ui/layout/sidebar/worldViewer/editorDebugEntity";
import type { EngineUiContextValue } from "@ui/utilities/engine-context";
import { useEffect } from "react";
import { Gizmo, Transform2D } from "@/components";
import type { GizmoAxis } from "@/components/gizmo";
import type { EntityId } from "@/ecs/entity";
import {
  GIZMO_CENTER_SQUARE_PX,
  GIZMO_HANDLE_HALF_PX,
  GIZMO_RADIUS_PX,
} from "@/core/render-pipeline/passes/render-gizmo";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const PICK_RADIUS_PIXELS = 18;

/**********************************************************************************************************
 *   HELPERS
 **********************************************************************************************************/

/**
 * Determines which gizmo axis (if any) was clicked given the click offset
 * from the gizmo center and the current camera zoom.
 */
function resolveGizmoAxis(
  dxWorld: number,
  dyWorld: number,
  entityRotation: number,
  zoom: number,
): GizmoAxis {
  const radiusWorld = GIZMO_RADIUS_PX / zoom;
  const centerHalfWorld = GIZMO_CENTER_SQUARE_PX / 2 / zoom;
  const handleHitRadiusWorld = (GIZMO_HANDLE_HALF_PX * Math.SQRT2) / zoom;

  // Check center square first (highest priority)
  if (Math.abs(dxWorld) <= centerHalfWorld && Math.abs(dyWorld) <= centerHalfWorld) {
    return "center";
  }

  // Check rotation handle square
  const handleCenterX = radiusWorld * Math.cos(entityRotation);
  const handleCenterY = radiusWorld * Math.sin(entityRotation);
  const handleDx = dxWorld - handleCenterX;
  const handleDy = dyWorld - handleCenterY;
  const handleDistSq = handleDx * handleDx + handleDy * handleDy;

  if (handleDistSq <= handleHitRadiusWorld * handleHitRadiusWorld) {
    return "handle";
  }

  // Check if within the ring
  const distSq = dxWorld * dxWorld + dyWorld * dyWorld;

  if (distSq > radiusWorld * radiusWorld) {
    return null;
  }

  // Determine quadrant by angle
  const angle = Math.atan2(dyWorld, dxWorld);
  const normalized = angle < 0 ? angle + Math.PI * 2 : angle;

  if (normalized < Math.PI / 2) {
    return "q1";
  }

  if (normalized < Math.PI) {
    return "q2";
  }

  if (normalized < Math.PI * 3 / 2) {
    return "q3";
  }

  return "q4";
}

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function usePausedGizmoSelection(engine: EngineUiContextValue): void {
  useEffect(() => {
    const canvas = engine.canvas;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !engine.editor.runningState.paused) {
        return;
      }

      if (engine.editor.camera.mode !== "engine") {
        return;
      }

      const viewport = canvas.getBoundingClientRect();
      const cameraX = engine.editor.camera.x;
      const cameraY = engine.editor.camera.y;
      const cameraZoom = engine.editor.camera.zoom;

      const worldX = (event.clientX - viewport.left - viewport.width / 2) / cameraZoom + cameraX;
      const worldY = (event.clientY - viewport.top - viewport.height / 2) / cameraZoom + cameraY;

      // ── Gizmo part click (no alt key) ─────────────────────────────────────
      if (!event.altKey) {
        for (const [, worldEntry] of engine.scene.context.worldEntries) {
          for (const gizmoEntityId of worldEntry.query(Gizmo)) {
            const gizmo = worldEntry.get(gizmoEntityId, Gizmo);
            const transform = worldEntry.get(gizmoEntityId, Transform2D);

            if (!gizmo || !transform) {
              continue;
            }

            const dxWorld = worldX - transform.curr.pos.x;
            const dyWorld = worldY - transform.curr.pos.y;
            const hitAxis = resolveGizmoAxis(dxWorld, dyWorld, transform.curr.rotation, cameraZoom);

            gizmo.activeAxis = hitAxis;
          }
        }

        return;
      }

      // ── Entity selection (alt key) ─────────────────────────────────────────
      const world = engine.scene.world;

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

    canvas.addEventListener("pointerdown", onPointerDown);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [engine]);
}