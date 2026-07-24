import { ShaderQuad } from "@engine/components";
import { FromRender, fromContext } from "@engine/context";
import type { Registry } from "@engine/ecs/registry";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

export function queueShaderQuads(
  world: Registry = fromContext(FromRender.Registry),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  world.forEach(ShaderQuad, (id, shaderQuad) => {
    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shader-entity";
    command.registry = world;
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