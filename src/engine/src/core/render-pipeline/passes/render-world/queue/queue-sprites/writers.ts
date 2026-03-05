import { Sprite } from "@engine/components";
import { Transform2D } from "@engine/components/transform";
import {
  SPRITE_RENDER_DIRTY_NONE,
  SPRITE_RENDER_DIRTY_SPRITE,
  SPRITE_RENDER_DIRTY_TRANSFORM,
  type SpriteRenderRecord,
} from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type SpriteFieldSnapshot = {
  assetId: string;
  sprite: Sprite;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function writeSpriteRecord(record: SpriteRenderRecord, snapshot: SpriteFieldSnapshot): number {
  let changed = false;
  const target = record.sprite;
  const { assetId, sprite } = snapshot;

  if (target.assetId !== assetId) {
    target.assetId = assetId;
    changed = true;
  }
  if (target.width !== sprite.width) {
    target.width = sprite.width;
    changed = true;
  }
  if (target.height !== sprite.height) {
    target.height = sprite.height;
    changed = true;
  }
  if (target.anchorX !== sprite.anchorX) {
    target.anchorX = sprite.anchorX;
    changed = true;
  }
  if (target.anchorY !== sprite.anchorY) {
    target.anchorY = sprite.anchorY;
    changed = true;
  }
  if (target.flipX !== sprite.flipX) {
    target.flipX = sprite.flipX;
    changed = true;
  }
  if (target.flipY !== sprite.flipY) {
    target.flipY = sprite.flipY;
    changed = true;
  }
  if (target.layer !== sprite.layer) {
    target.layer = sprite.layer;
    changed = true;
  }
  if (target.zOrder !== sprite.zOrder) {
    target.zOrder = sprite.zOrder;
    changed = true;
  }
  if (target.tint.r !== sprite.tint.r) {
    target.tint.r = sprite.tint.r;
    changed = true;
  }
  if (target.tint.g !== sprite.tint.g) {
    target.tint.g = sprite.tint.g;
    changed = true;
  }
  if (target.tint.b !== sprite.tint.b) {
    target.tint.b = sprite.tint.b;
    changed = true;
  }
  if (target.tint.a !== sprite.tint.a) {
    target.tint.a = sprite.tint.a;
    changed = true;
  }

  if (!changed) {
    return SPRITE_RENDER_DIRTY_NONE;
  }

  record.spriteVersion += 1;
  return SPRITE_RENDER_DIRTY_SPRITE;
}

export function writeTransformRecord(record: SpriteRenderRecord, source: Transform2D): number {
  let changed = false;
  const target = record.worldTransform;

  if (target.curr.pos.x !== source.curr.pos.x) {
    target.curr.pos.x = source.curr.pos.x;
    changed = true;
  }
  if (target.curr.pos.y !== source.curr.pos.y) {
    target.curr.pos.y = source.curr.pos.y;
    changed = true;
  }
  if (target.curr.rotation !== source.curr.rotation) {
    target.curr.rotation = source.curr.rotation;
    changed = true;
  }
  if (target.curr.scale.x !== source.curr.scale.x) {
    target.curr.scale.x = source.curr.scale.x;
    changed = true;
  }
  if (target.curr.scale.y !== source.curr.scale.y) {
    target.curr.scale.y = source.curr.scale.y;
    changed = true;
  }
  if (target.prev.pos.x !== source.prev.pos.x) {
    target.prev.pos.x = source.prev.pos.x;
    changed = true;
  }
  if (target.prev.pos.y !== source.prev.pos.y) {
    target.prev.pos.y = source.prev.pos.y;
    changed = true;
  }
  if (target.prev.rotation !== source.prev.rotation) {
    target.prev.rotation = source.prev.rotation;
    changed = true;
  }
  if (target.prev.scale.x !== source.prev.scale.x) {
    target.prev.scale.x = source.prev.scale.x;
    changed = true;
  }
  if (target.prev.scale.y !== source.prev.scale.y) {
    target.prev.scale.y = source.prev.scale.y;
    changed = true;
  }

  if (!changed) {
    return SPRITE_RENDER_DIRTY_NONE;
  }

  record.transformVersion += 1;
  return SPRITE_RENDER_DIRTY_TRANSFORM;
}