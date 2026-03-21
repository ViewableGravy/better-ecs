import { Rgba } from "@engine/components";
import { Transform2D } from "@engine/components/transform";

export const SPRITE_RENDER_DIRTY_NONE = 0;
export const SPRITE_RENDER_DIRTY_SPRITE = 1 << 0;
export const SPRITE_RENDER_DIRTY_TRANSFORM = 1 << 1;

export type SpriteRenderDirtyMask = number;

export type SpriteRenderState = {
  assetId: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  flipX: boolean;
  flipY: boolean;
  layer: number;
  zOrder: number;
  isDynamic: boolean;
  tint: Rgba;
};

export type SpriteRenderRecord = {
  sprite: SpriteRenderState;
  worldTransform: Transform2D;
  spriteVersion: number;
  transformVersion: number;
  dirtyMask: SpriteRenderDirtyMask;
  isVisible: boolean;
};

export function createSpriteRenderRecord(): SpriteRenderRecord {
  return {
    sprite: {
      assetId: "",
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
    },
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
