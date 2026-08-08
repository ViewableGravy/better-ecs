import { Text } from "@engine/components";
import { FromRender, fromContext } from "@engine/context";
import type { Registry } from "@engine/ecs/registry";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

export function queueTexts(
  world: Registry = fromContext(FromRender.Registry),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  world.forEach(Text, (id, text) => {
    const command = frameAllocator.acquire("engine:render-command");
    command.type = "text-entity";
    command.registry = world;
    command.entityId = id;
    command.shape = null;
    command.scope = "gameplay";
    command.bucketKind = "text";
    command.bucketKey = `text:${text.fontFamily}:${text.fontWeight}:${text.fontSize}`;
    command.layer = text.layer;
    command.zOrder = text.zOrder;

    queue.add(command);
  });
}