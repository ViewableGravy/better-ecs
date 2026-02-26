import { EditorDebugEntity } from "@ui/layout/sidebar/worldViewer/editorDebugEntity";
import type { EngineUiContextValue } from "@ui/utilities/engine-context";
import { useEffect } from "react";
import { Gizmo, Transform2D } from "../../../../../components";
import type { EntityId } from "../../../../../ecs/entity";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const PICK_RADIUS_PIXELS = 18;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function usePausedGizmoSelection(engine: EngineUiContextValue): void {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.altKey || !engine.editor.runningState.paused) {
        return;
      }

      if (engine.editor.camera.mode !== "engine") {
        return;
      }

      const world = engine.scene.world;
      const canvas = engine.canvas;
      const viewport = canvas.getBoundingClientRect();
      const cameraX = engine.editor.camera.x;
      const cameraY = engine.editor.camera.y;
      const cameraZoom = engine.editor.camera.zoom;

      const worldX = (event.clientX - viewport.left - viewport.width / 2) / cameraZoom + cameraX;
      const worldY = (event.clientY - viewport.top - viewport.height / 2) / cameraZoom + cameraY;
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

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [engine]);
}