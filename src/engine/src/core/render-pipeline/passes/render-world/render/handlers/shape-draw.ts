import { fromContext, FromRender } from "@engine/context";
import type { ShapeDrawRenderCommand } from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import type { Renderer } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ShapeRenderer = Pick<Renderer, "drawShape">;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function handleShapeDrawCommand(
  command: ShapeDrawRenderCommand,
  renderer: ShapeRenderer = fromContext(FromRender.Renderer),
): void {
  renderer.drawShape(command.shape);
}
