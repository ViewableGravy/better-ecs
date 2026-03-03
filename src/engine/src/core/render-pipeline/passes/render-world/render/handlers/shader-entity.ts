import type { LooseAssetManager } from "@engine/asset/AssetManager";
import { isShaderSourceAsset } from "@engine/asset/utils";
import { EditorHoverHighlight, ShaderQuad } from "@engine/components";
import { Color } from "@engine/components/sprite/sprite";
import type { Transform2D } from "@engine/components/transform";
import { fromContext, FromEngine, FromRender } from "@engine/context";
import type { ShaderEntityRenderCommand } from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import { blendColor } from "@engine/core/render-pipeline/passes/render-world/render/utils/blend";
import type { Renderer } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ShaderRenderer = Pick<Renderer, "drawTexturedQuad">;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const HOVER_TINT_COLOR = new Color(1, 1, 0, 1);
const SHARED_HOVER_TINT = new Color(1, 1, 1, 1);

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function handleShaderEntityCommand(
  command: ShaderEntityRenderCommand,
  transform: Transform2D,
  renderer: ShaderRenderer = fromContext(FromRender.Renderer),
  assets: LooseAssetManager = fromContext(FromEngine.Assets),
  interpolationAlpha: number = fromContext(FromRender.InterpolationAlpha),
): void {
  const world = command.world;
  const entityId = command.entityId;

  const shaderQuad = world.get(entityId, ShaderQuad);
  if (!shaderQuad) {
    return;
  }

  const loadedShader = assets.getLoose(shaderQuad.assetId);
  if (!isShaderSourceAsset(loadedShader)) {
    return;
  }

  const hoverHighlight = world.get(entityId, EditorHoverHighlight);
  const tint = hoverHighlight
    ? blendColor(shaderQuad.tint, HOVER_TINT_COLOR, hoverHighlight.amount, SHARED_HOVER_TINT)
    : shaderQuad.tint;

  renderer.drawTexturedQuad({
    shader: loadedShader,
    x: transform.prev.pos.x + (transform.curr.pos.x - transform.prev.pos.x) * interpolationAlpha,
    y: transform.prev.pos.y + (transform.curr.pos.y - transform.prev.pos.y) * interpolationAlpha,
    width: shaderQuad.width,
    height: shaderQuad.height,
    rotation: transform.curr.rotation,
    scaleX: transform.curr.scale.x,
    scaleY: transform.curr.scale.y,
    anchorX: shaderQuad.anchorX,
    anchorY: shaderQuad.anchorY,
    tint,
    time: shaderQuad.useTime ? performance.now() : 0,
  });
}
