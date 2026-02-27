import { Shape, Sprite } from "../../../../../components";
import { Color } from "../../../../../components/sprite";
import { Transform2D } from "../../../../../components/transform";
import { resolveWorldTransform2D } from "../../../../../ecs/hierarchy";
import type {
  EngineFrameAllocatorRegistry,
  InternalFrameAllocator,
  Renderer,
  RenderQueue,
} from "../../../../../render";

const SHARED_RENDER_TRANSFORM = new Transform2D();

export function renderCommands(
  queue: RenderQueue,
  renderer: Renderer,
  alpha: number,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  for (const command of queue.commands) {
    if (command.type === "shape-draw") {
      if (command.shape) {
        renderer.drawShape(command.shape);
      }
      continue;
    }

    const world = command.world;
    const entityId = command.entityId;
    if (!world || entityId === null) {
      continue;
    }

    if (!resolveWorldTransform2D(world, entityId, SHARED_RENDER_TRANSFORM)) {
      continue;
    }

    if (command.type === "sprite-entity") {
      const sprite = world.get(entityId, Sprite);
      if (!sprite) {
        continue;
      }

      renderer.render(sprite, SHARED_RENDER_TRANSFORM, alpha);
      continue;
    }

    const shape = world.get(entityId, Shape);
    if (!shape) {
      continue;
    }

    const shapeCommand = frameAllocator.acquire("engine:shape-command");
    shapeCommand.type = shape.type;
    shapeCommand.x = SHARED_RENDER_TRANSFORM.prev.pos.x +
      (SHARED_RENDER_TRANSFORM.curr.pos.x - SHARED_RENDER_TRANSFORM.prev.pos.x) * alpha;
    shapeCommand.y = SHARED_RENDER_TRANSFORM.prev.pos.y +
      (SHARED_RENDER_TRANSFORM.curr.pos.y - SHARED_RENDER_TRANSFORM.prev.pos.y) * alpha;
    shapeCommand.width = shape.width;
    shapeCommand.height = shape.height;
    shapeCommand.rotation = SHARED_RENDER_TRANSFORM.curr.rotation;
    shapeCommand.scaleX = SHARED_RENDER_TRANSFORM.curr.scale.x;
    shapeCommand.scaleY = SHARED_RENDER_TRANSFORM.curr.scale.y;
    shapeCommand.fill.r = shape.fill.r;
    shapeCommand.fill.g = shape.fill.g;
    shapeCommand.fill.b = shape.fill.b;
    shapeCommand.fill.a = shape.fill.a;

    if (shape.stroke) {
      if (shapeCommand.stroke === null) {
        shapeCommand.stroke = new Color(shape.stroke.r, shape.stroke.g, shape.stroke.b, shape.stroke.a);
      } else {
        shapeCommand.stroke.r = shape.stroke.r;
        shapeCommand.stroke.g = shape.stroke.g;
        shapeCommand.stroke.b = shape.stroke.b;
        shapeCommand.stroke.a = shape.stroke.a;
      }
    } else {
      shapeCommand.stroke = null;
    }

    shapeCommand.strokeWidth = shape.strokeWidth;
    shapeCommand.arcStart = shape.arcStart;
    shapeCommand.arcEnd = shape.arcEnd;

    renderer.drawShape(shapeCommand);
  }
}
