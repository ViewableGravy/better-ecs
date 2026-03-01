import { AnimatedSprite, EditorHoverHighlight, Sprite } from "@components";
import { getFrameAssetIdAtTime } from "@components/sprite/animated";
import { Color } from "@components/sprite/sprite";
import type { Transform2D } from "@components/transform";
import { fromContext, FromRender } from "@context";
import type { SpriteEntityRenderCommand } from "@core/render-pipeline/passes/render-world/render/culling/utils";
import { blendChannel } from "@core/render-pipeline/passes/render-world/render/utils/blend";
import type { Renderer } from "@render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type SpriteRenderer = Pick<Renderer, "render">;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const HOVER_TINT_COLOR = new Color(1, 1, 0, 1);
let SHARED_ANIMATED_RENDER_SPRITE: Sprite | null = null;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function handleSpriteEntityCommand(
  command: SpriteEntityRenderCommand,
  transform: Transform2D,
  renderer: SpriteRenderer = fromContext(FromRender.Renderer),
  interpolationAlpha: number = fromContext(FromRender.InterpolationAlpha),
): void {
  const world = command.world;
  const entityId = command.entityId;
  const now = performance.now();

  const staticSprite = world.get(entityId, Sprite);
  const sprite = staticSprite ?? projectAnimatedSprite(world.get(entityId, AnimatedSprite), now);
  if (!sprite) {
    return;
  }

  const hoverHighlight = world.get(entityId, EditorHoverHighlight);
  if (!hoverHighlight) {
    renderer.render(sprite, transform, interpolationAlpha);
    return;
  }

  const originalR = sprite.tint.r;
  const originalG = sprite.tint.g;
  const originalB = sprite.tint.b;

  sprite.tint.r = blendChannel(sprite.tint.r, HOVER_TINT_COLOR.r, hoverHighlight.amount);
  sprite.tint.g = blendChannel(sprite.tint.g, HOVER_TINT_COLOR.g, hoverHighlight.amount);
  sprite.tint.b = blendChannel(sprite.tint.b, HOVER_TINT_COLOR.b, hoverHighlight.amount);

  renderer.render(sprite, transform, interpolationAlpha);

  sprite.tint.r = originalR;
  sprite.tint.g = originalG;
  sprite.tint.b = originalB;
}

function projectAnimatedSprite(animatedSprite: AnimatedSprite | undefined, timeMs: number): Sprite | null {
  if (!animatedSprite) {
    return null;
  }

  const sampledAssetId = getFrameAssetIdAtTime(animatedSprite, timeMs);
  if (!SHARED_ANIMATED_RENDER_SPRITE) {
    SHARED_ANIMATED_RENDER_SPRITE = new Sprite(sampledAssetId);
  }

  const projected = SHARED_ANIMATED_RENDER_SPRITE;
  projected.assetId = sampledAssetId;
  projected.width = animatedSprite.width;
  projected.height = animatedSprite.height;
  projected.anchorX = animatedSprite.anchorX;
  projected.anchorY = animatedSprite.anchorY;
  projected.flipX = animatedSprite.flipX;
  projected.flipY = animatedSprite.flipY;
  projected.layer = animatedSprite.layer;
  projected.zOrder = animatedSprite.zOrder;
  projected.tint.r = animatedSprite.tint.r;
  projected.tint.g = animatedSprite.tint.g;
  projected.tint.b = animatedSprite.tint.b;
  projected.tint.a = animatedSprite.tint.a;
  return projected;
}
