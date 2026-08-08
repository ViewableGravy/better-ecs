import { resolveEntityTint, Text } from "@engine/components";
import type { Transform2D } from "@engine/components/transform";
import { fromContext, FromRender } from "@engine/context";
import type { TextEntityRenderCommand } from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, Renderer } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type TextRenderer = Pick<Renderer, "drawText">;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function handleTextEntityCommand(
  command: TextEntityRenderCommand,
  transform: Transform2D,
  renderer: TextRenderer = fromContext(FromRender.Renderer),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(FromRender.FrameAllocator),
  interpolationAlpha: number = fromContext(FromRender.InterpolationAlpha),
): void {
  const text = command.registry.get(command.entityId, Text);
  if (!text) {
    return;
  }

  const textCommand = frameAllocator.acquire("engine:text-command");
  textCommand.text = text.value;
  textCommand.fontSize = text.fontSize;
  textCommand.fontFamily = text.fontFamily;
  textCommand.fontWeight = text.fontWeight;
  textCommand.x = transform.prev.pos.x + (transform.curr.pos.x - transform.prev.pos.x) * interpolationAlpha;
  textCommand.y = transform.prev.pos.y + (transform.curr.pos.y - transform.prev.pos.y) * interpolationAlpha;
  textCommand.rotation = transform.curr.rotation;
  textCommand.scaleX = transform.curr.scale.x;
  textCommand.scaleY = transform.curr.scale.y;
  textCommand.anchorX = text.anchorX;
  textCommand.anchorY = text.anchorY;
  resolveEntityTint(command.registry, command.entityId, textCommand.tint);

  renderer.drawText(textCommand);
}