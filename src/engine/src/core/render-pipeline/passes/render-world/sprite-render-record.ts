import { Sprite } from "@engine/components";
import { Transform2D } from "@engine/components/transform";

export const SPRITE_RENDER_DIRTY_NONE = 0;
export const SPRITE_RENDER_DIRTY_SPRITE = 1 << 0;
export const SPRITE_RENDER_DIRTY_TRANSFORM = 1 << 1;

export type SpriteRenderDirtyMask = number;

export type SpriteRenderRecord = {
  sprite: Sprite;
  worldTransform: Transform2D;
  spriteVersion: number;
  transformVersion: number;
  dirtyMask: SpriteRenderDirtyMask;
  isVisible: boolean;
};

export function createSpriteRenderRecord(): SpriteRenderRecord {
  return {
    sprite: new Sprite(""),
    worldTransform: new Transform2D(),
    spriteVersion: 0,
    transformVersion: 0,
    dirtyMask: SPRITE_RENDER_DIRTY_NONE,
    isVisible: true,
  };
}

export function hasSpriteRenderDirtyFlag(
  dirtyMask: SpriteRenderDirtyMask,
  flag: SpriteRenderDirtyMask,
): boolean {
  return (dirtyMask & flag) !== SPRITE_RENDER_DIRTY_NONE;
}
