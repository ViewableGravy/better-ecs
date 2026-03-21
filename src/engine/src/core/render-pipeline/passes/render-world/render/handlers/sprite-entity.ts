import { AnimatedSprite, EditorHoverHighlight, resolveEntityTint, Sprite } from "@engine/components";
import { getFrameAssetIdAtTime } from "@engine/components/sprite/animated";
import { Rgba } from "@engine/components/sprite/sprite";
import type { Transform2D } from "@engine/components/transform";
import { fromContext, FromRender } from "@engine/context";
import type { SpriteEntityRenderCommand } from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import { blendChannel } from "@engine/core/render-pipeline/passes/render-world/render/utils/blend";
import type { SpriteRenderRecord, SpriteRenderState } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import type { Renderer } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type SpriteRenderer = Pick<Renderer, "renderSprite">;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const HOVER_TINT_COLOR = new Rgba(1, 1, 0, 1);
const SHARED_RESOLVED_TINT = new Rgba(1, 1, 1, 1);
let SHARED_ANIMATED_RENDER_SPRITE: SpriteRenderState | null = null;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function handleSpriteEntityCommand(
  command: SpriteEntityRenderCommand,
  transform: Transform2D,
  renderer: SpriteRenderer = fromContext(FromRender.Renderer),
  interpolationAlpha: number = fromContext(FromRender.InterpolationAlpha),
  spriteRecord: SpriteRenderRecord | null = null,
): void {
  const world = command.world;
  const entityId = command.entityId;
  const sprite = spriteRecord?.sprite ?? resolveSpriteForRender(world, entityId);
  if (!sprite) {
    return;
  }

  const hoverHighlight = world.get(entityId, EditorHoverHighlight);
  if (!hoverHighlight) {
    renderer.renderSprite(sprite, transform, interpolationAlpha);
    return;
  }

  const originalR = sprite.tint.r;
  const originalG = sprite.tint.g;
  const originalB = sprite.tint.b;

  sprite.tint.r = blendChannel(sprite.tint.r, HOVER_TINT_COLOR.r, hoverHighlight.amount);
  sprite.tint.g = blendChannel(sprite.tint.g, HOVER_TINT_COLOR.g, hoverHighlight.amount);
  sprite.tint.b = blendChannel(sprite.tint.b, HOVER_TINT_COLOR.b, hoverHighlight.amount);

  renderer.renderSprite(sprite, transform, interpolationAlpha);

  sprite.tint.r = originalR;
  sprite.tint.g = originalG;
  sprite.tint.b = originalB;
}

function resolveSpriteForRender(
  world: SpriteEntityRenderCommand["world"],
  entityId: SpriteEntityRenderCommand["entityId"],
): SpriteRenderState | null {
  const staticSprite = world.get(entityId, Sprite);
  if (staticSprite) {
    return projectStaticSprite(world, entityId, staticSprite);
  }

  return projectAnimatedSprite(world, entityId, world.get(entityId, AnimatedSprite), performance.now());
}

function projectStaticSprite(
  world: SpriteEntityRenderCommand["world"],
  entityId: SpriteEntityRenderCommand["entityId"],
  sprite: Sprite,
): SpriteRenderState {
  return {
    assetId: sprite.assetId,
    width: sprite.width,
    height: sprite.height,
    anchorX: sprite.anchorX,
    anchorY: sprite.anchorY,
    flipX: sprite.flipX,
    flipY: sprite.flipY,
    layer: sprite.layer,
    zOrder: sprite.zOrder,
    isDynamic: sprite.isDynamic,
    tint: resolveEntityTint(world, entityId, SHARED_RESOLVED_TINT),
  };
}

function projectAnimatedSprite(
  world: SpriteEntityRenderCommand["world"],
  entityId: SpriteEntityRenderCommand["entityId"],
  animatedSprite: AnimatedSprite | undefined,
  timeMs: number,
): SpriteRenderState | null {
  if (!animatedSprite) {
    return null;
  }

  const sampledAssetId = getFrameAssetIdAtTime(animatedSprite, timeMs);
  if (!SHARED_ANIMATED_RENDER_SPRITE) {
    SHARED_ANIMATED_RENDER_SPRITE = {
      assetId: sampledAssetId,
      width: 0,
      height: 0,
      anchorX: 0.5,
      anchorY: 0.5,
      flipX: false,
      flipY: false,
      layer: 0,
      zOrder: 0,
      isDynamic: true,
      tint: new Rgba(),
    };
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
  projected.isDynamic = animatedSprite.isDynamic;
  resolveEntityTint(world, entityId, projected.tint);
  return projected;
}
