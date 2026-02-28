import { ShaderQuad } from "@components";
import { FromRender, fromContext } from "@context";
import type { UserWorld } from "@ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@render";

export function queueShaderQuads(
  world: UserWorld = fromContext(FromRender.World),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
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