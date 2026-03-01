import { fromContext, FromRender } from "@context";
import type { ShapeDrawRenderCommand } from "@core/render-pipeline/passes/render-world/render/culling/utils";
import type { Renderer } from "@render";

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
