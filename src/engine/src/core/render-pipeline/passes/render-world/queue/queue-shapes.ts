import { Shape } from "@engine/components";
import { FromRender, fromContext } from "@engine/context";
import type { Registry } from "@engine/ecs/registry";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

export function queueShapes(
  world: Registry = fromContext(FromRender.Registry),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  world.forEach(Shape, (id, shape) => {
    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shape-entity";
    command.registry = world;
    command.entityId = id;
    command.shape = null;
    command.scope = "gameplay";
    command.bucketKind = "shape";
    command.bucketKey = "shape";
    command.layer = shape.layer;
    command.zOrder = shape.zOrder;

    queue.add(command);
  });
}
