import { Shape, Sprite } from "../../../components";
import { Color } from "../../../components/sprite";
import { Transform2D } from "../../../components/transform";
import { resolveWorldTransform2D } from "../../../ecs/hierarchy";
import { createRenderPass } from "../pass";

const SHARED_RENDER_TRANSFORM = new Transform2D();

export const RenderWorldPass = createRenderPass("world-render")({
  scope: "world",
  execute({ world, queue, renderer, alpha, frameAllocator }) {
    queue.clear();

    for (const id of world.query(Sprite)) {
      queue.addSprite(id);
    }

    for (const id of world.query(Shape)) {
      queue.addShape(id);
    }

    queue.sortSprites((a, b) => {
      const spriteA = world.get(a, Sprite);
      const spriteB = world.get(b, Sprite);

      if (!spriteA || !spriteB) {
        return 0;
      }

      if (spriteA.layer !== spriteB.layer) {
        return spriteA.layer - spriteB.layer;
      }

      return spriteA.zOrder - spriteB.zOrder;
    });

    queue.sortShapes((a, b) => {
      const shapeA = world.get(a, Shape);
      const shapeB = world.get(b, Shape);

      if (!shapeA || !shapeB) {
        return 0;
      }

      if (shapeA.layer !== shapeB.layer) {
        return shapeA.layer - shapeB.layer;
      }

      return shapeA.zOrder - shapeB.zOrder;
    });

    for (const id of queue.shapes) {
      const shape = world.get(id, Shape);
      if (!shape) {
        continue;
      }

      if (!resolveWorldTransform2D(world, id, SHARED_RENDER_TRANSFORM)) {
        continue;
      }

      const command = frameAllocator.acquire("engine:shape-command");
      command.type = shape.type;
      command.x = SHARED_RENDER_TRANSFORM.prev.pos.x +
        (SHARED_RENDER_TRANSFORM.curr.pos.x - SHARED_RENDER_TRANSFORM.prev.pos.x) * alpha;
      command.y = SHARED_RENDER_TRANSFORM.prev.pos.y +
        (SHARED_RENDER_TRANSFORM.curr.pos.y - SHARED_RENDER_TRANSFORM.prev.pos.y) * alpha;
      command.width = shape.width;
      command.height = shape.height;
      command.rotation = SHARED_RENDER_TRANSFORM.curr.rotation;
      command.scaleX = SHARED_RENDER_TRANSFORM.curr.scale.x;
      command.scaleY = SHARED_RENDER_TRANSFORM.curr.scale.y;
      command.fill.r = shape.fill.r;
      command.fill.g = shape.fill.g;
      command.fill.b = shape.fill.b;
      command.fill.a = shape.fill.a;

      if (shape.stroke) {
        if (command.stroke === null) {
          command.stroke = new Color(shape.stroke.r, shape.stroke.g, shape.stroke.b, shape.stroke.a);
        } else {
          command.stroke.r = shape.stroke.r;
          command.stroke.g = shape.stroke.g;
          command.stroke.b = shape.stroke.b;
          command.stroke.a = shape.stroke.a;
        }
      } else {
        command.stroke = null;
      }

      command.strokeWidth = shape.strokeWidth;

      renderer.low.drawShape(command);
    }

    for (const id of queue.sprites) {
      const sprite = world.get(id, Sprite);
      if (!sprite) {
        continue;
      }

      if (!resolveWorldTransform2D(world, id, SHARED_RENDER_TRANSFORM)) {
        continue;
      }

      renderer.high.render(sprite, SHARED_RENDER_TRANSFORM, alpha);
    }
  },
});
