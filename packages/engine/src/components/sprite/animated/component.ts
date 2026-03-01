import { Color, Sprite } from "@components/sprite/sprite";
import type { RegisteredAssets } from "@core";

type SpriteAssetId = Exclude<keyof RegisteredAssets, number | symbol>;

type AnimatedSpriteConfig = {
  assets: readonly SpriteAssetId[];
  width?: number;
  height?: number;
  anchorX?: number;
  anchorY?: number;
  flipX?: boolean;
  flipY?: boolean;
  tint?: Color;
  zOrder?: number;
  layer?: number;
  playbackRate?: number;
  startTime?: number;
};

function isAnimatedSpriteConfig(
  value: AnimatedSpriteConfig | readonly SpriteAssetId[],
): value is AnimatedSpriteConfig {
  return !Array.isArray(value);
}

export class AnimatedSprite extends Sprite {
  public readonly frames: readonly SpriteAssetId[];

  public playbackRate = 1;
  public startTime = performance.now();

  constructor(frames: readonly SpriteAssetId[]);
  constructor(config: AnimatedSpriteConfig);
  constructor(configOrFrames: AnimatedSpriteConfig | readonly SpriteAssetId[]) {
    let config: AnimatedSpriteConfig | undefined;
    let frames: readonly SpriteAssetId[];

    if (isAnimatedSpriteConfig(configOrFrames)) {
      config = configOrFrames;
      frames = config.assets;
    } else {
      frames = configOrFrames;
    }

    if (frames.length === 0) {
      throw new Error("AnimatedSprite requires at least one frame asset id");
    }

    super(
      frames[0],
      config?.width,
      config?.height,
      config?.anchorX,
      config?.anchorY,
      config?.flipX,
      config?.flipY,
      config?.tint,
      config?.zOrder,
      config?.layer,
    );

    this.frames = frames;

    if (config?.playbackRate !== undefined) {
      this.playbackRate = config.playbackRate;
    }

    if (config?.startTime !== undefined) {
      this.startTime = config.startTime;
    }
  }
}
