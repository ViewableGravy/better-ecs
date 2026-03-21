import { EditorHoverHighlight, resolveEntityFillColor, resolveEntityStrokeColor, Shape } from "@engine/components";
import { Rgba } from "@engine/components/sprite/sprite";
import type { Transform2D } from "@engine/components/transform";
import { fromContext, FromRender } from "@engine/context";
import type { ShapeEntityRenderCommand } from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import { blendChannel } from "@engine/core/render-pipeline/passes/render-world/render/utils/blend";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, Renderer } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ShapeRenderer = Pick<Renderer, "drawShape">;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const HOVER_TINT_COLOR = new Rgba(1, 1, 0, 1);
const SHARED_FILL = new Rgba(1, 1, 1, 1);
const SHARED_STROKE = new Rgba(1, 1, 1, 1);

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function handleShapeEntityCommand(
  command: ShapeEntityRenderCommand,
  transform: Transform2D,
  renderer: ShapeRenderer = fromContext(FromRender.Renderer),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(FromRender.FrameAllocator),
  interpolationAlpha: number = fromContext(FromRender.InterpolationAlpha),
): void {
  const world = command.world;
  const entityId = command.entityId;

  const shape = world.get(entityId, Shape);
  if (!shape) {
    return;
  }

  const shapeCommand = frameAllocator.acquire("engine:shape-command");
  shapeCommand.type = shape.type;
  shapeCommand.x = transform.prev.pos.x + (transform.curr.pos.x - transform.prev.pos.x) * interpolationAlpha;
  shapeCommand.y = transform.prev.pos.y + (transform.curr.pos.y - transform.prev.pos.y) * interpolationAlpha;
  shapeCommand.width = shape.width;
  shapeCommand.height = shape.height;
  shapeCommand.rotation = transform.curr.rotation;
  shapeCommand.scaleX = transform.curr.scale.x;
  shapeCommand.scaleY = transform.curr.scale.y;
  resolveEntityFillColor(world, entityId, SHARED_FILL);
  shapeCommand.fill.r = SHARED_FILL.r;
  shapeCommand.fill.g = SHARED_FILL.g;
  shapeCommand.fill.b = SHARED_FILL.b;
  shapeCommand.fill.a = SHARED_FILL.a;

  const hoverHighlight = world.get(entityId, EditorHoverHighlight);
  if (hoverHighlight) {
    shapeCommand.fill.r = blendChannel(shapeCommand.fill.r, HOVER_TINT_COLOR.r, hoverHighlight.amount);
    shapeCommand.fill.g = blendChannel(shapeCommand.fill.g, HOVER_TINT_COLOR.g, hoverHighlight.amount);
    shapeCommand.fill.b = blendChannel(shapeCommand.fill.b, HOVER_TINT_COLOR.b, hoverHighlight.amount);
  }

  if (resolveEntityStrokeColor(world, entityId, SHARED_STROKE)) {
    if (shapeCommand.stroke === null) {
      shapeCommand.stroke = new Rgba(SHARED_STROKE.r, SHARED_STROKE.g, SHARED_STROKE.b, SHARED_STROKE.a);
    } else {
      shapeCommand.stroke.r = SHARED_STROKE.r;
      shapeCommand.stroke.g = SHARED_STROKE.g;
      shapeCommand.stroke.b = SHARED_STROKE.b;
      shapeCommand.stroke.a = SHARED_STROKE.a;
    }

    if (hoverHighlight && shapeCommand.stroke) {
      shapeCommand.stroke.r = blendChannel(shapeCommand.stroke.r, HOVER_TINT_COLOR.r, hoverHighlight.amount);
      shapeCommand.stroke.g = blendChannel(shapeCommand.stroke.g, HOVER_TINT_COLOR.g, hoverHighlight.amount);
      shapeCommand.stroke.b = blendChannel(shapeCommand.stroke.b, HOVER_TINT_COLOR.b, hoverHighlight.amount);
    }
  } else {
    shapeCommand.stroke = null;
  }

  shapeCommand.strokeWidth = shape.strokeWidth;
  shapeCommand.fillEnabled = true;
  shapeCommand.arcEnabled = false;
  shapeCommand.arcStart = 0;
  shapeCommand.arcEnd = Math.PI * 2;
  shapeCommand.cornerRadius = 0;

  renderer.drawShape(shapeCommand);
}
