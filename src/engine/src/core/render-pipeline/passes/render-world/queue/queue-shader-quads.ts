import { ShaderQuad } from "@engine/components";
import { FromRender, fromContext } from "@engine/context";
import type { UserWorld } from "@engine/ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

export function queueShaderQuads(
  world: UserWorld = fromContext(FromRender.World),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  world.forEach(ShaderQuad, (id, shaderQuad) => {
    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shader-entity";
    command.world = world;
    command.entityId = id;
    command.shape = null;
    command.scope = "gameplay";
    command.bucketKind = "shader";
    command.bucketKey = `shader:${shaderQuad.assetId}`;
    command.layer = shaderQuad.layer;
    command.zOrder = shaderQuad.zOrder;

    queue.add(command);
  });
}