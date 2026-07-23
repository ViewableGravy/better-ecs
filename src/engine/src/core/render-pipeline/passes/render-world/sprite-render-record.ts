import type { Rgba } from "@engine/components";
import { Transform2D } from "@engine/components/transform";

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
};
