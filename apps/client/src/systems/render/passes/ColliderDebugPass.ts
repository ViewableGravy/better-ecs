import { buildModeState } from "@/systems/build-mode/state";
import { resolveCameraView } from "@/utilities/world-camera";
import { createRenderPass } from "@repo/engine";
import { Color, Transform2D } from "@repo/engine/components";
import { CircleCollider, CompoundCollider, RectangleCollider, getEntityCollider } from "@repo/physics";

const COLLIDER_FILL = new Color(0, 0, 0, 0);
const COLLIDER_STROKE = new Color(0.2, 1, 0.8, 1);
const COLLIDER_LINE_WIDTH = 1;

export const ColliderDebugPass = createRenderPass("collider-debug")({
  scope: "world",
  execute({ world, renderer, alpha }) {
    if (!buildModeState.colliderDebugVisible) {
      return;
    }

    const viewportHeight = renderer.low.getHeight();
    const camera = resolveCameraView(world, viewportHeight);
    renderer.low.setCamera(camera.x, camera.y, camera.zoom);

    for (const id of world.query(Transform2D)) {
      const transform = world.get(id, Transform2D);
      if (!transform) {
        continue;
      }

      const collider = getEntityCollider(world, id);
      if (!collider) {
        continue;
      }

      const primitive = collider instanceof CompoundCollider ? collider.collider : collider;
      const positionX = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
      const positionY = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);

      if (primitive instanceof CircleCollider) {
        renderer.low.drawShape({
          type: "circle",
          x: positionX,
          y: positionY,
          width: primitive.radius * 2,
          height: primitive.radius * 2,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          fill: COLLIDER_FILL,
          stroke: COLLIDER_STROKE,
          strokeWidth: COLLIDER_LINE_WIDTH,
        });
        continue;
      }

      if (!(primitive instanceof RectangleCollider)) {
        continue;
      }

      const centerX = positionX + primitive.bounds.left + primitive.bounds.size.x / 2;
      const centerY = positionY + primitive.bounds.top + primitive.bounds.size.y / 2;

      renderer.low.drawShape({
        type: "rectangle",
        x: centerX,
        y: centerY,
        width: primitive.bounds.size.x,
        height: primitive.bounds.size.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        fill: COLLIDER_FILL,
        stroke: COLLIDER_STROKE,
        strokeWidth: COLLIDER_LINE_WIDTH,
      });
    }
  },
});

function lerp(prev: number, current: number, alpha: number): number {
  return prev + (current - prev) * alpha;
}
