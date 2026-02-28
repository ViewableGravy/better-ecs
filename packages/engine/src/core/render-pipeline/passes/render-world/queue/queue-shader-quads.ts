import { ShaderQuad } from "../../../../../components";
import type { UserWorld } from "../../../../../ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "../../../../../render";

export function queueShaderQuads(
  world: UserWorld,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  for (const id of world.query(ShaderQuad)) {
    const shaderQuad = world.require(id, ShaderQuad);

    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shader-entity";
    command.world = world;
    command.entityId = id;
    command.shape = null;
    command.layer = shaderQuad.layer;
    command.zOrder = shaderQuad.zOrder;

    queue.add(command);
  }
}