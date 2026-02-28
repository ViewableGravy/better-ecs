import { setFrame } from "@components/sprite/animated/utility";
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
  loop?: boolean;
  playbackRate?: number;
  playing?: boolean;
  currentIndex?: number;
};

function isAnimatedSpriteConfig(
  value: AnimatedSpriteConfig | readonly SpriteAssetId[],
): value is AnimatedSpriteConfig {
  return !Array.isArray(value);
}

export class AnimatedSprite extends Sprite {
  public readonly frames: readonly SpriteAssetId[];

  public currentIndex = 0;
  public loop = true;
  public playbackRate = 1;
  public playing = true;

  public onFrameChange: ((sprite: AnimatedSprite, nextAssetId: SpriteAssetId, nextIndex: number) => void) | null = null;
  public onLoop: ((sprite: AnimatedSprite) => void) | null = null;
  public onComplete: ((sprite: AnimatedSprite) => void) | null = null;

  /** @private */
  public accumulatedMs = 0;
  /** @private */
  public completed = false;

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

    if (config?.loop !== undefined) {
      this.loop = config.loop;
    }

    if (config?.playbackRate !== undefined) {
      this.playbackRate = config.playbackRate;
    }

    if (config?.playing !== undefined) {
      this.playing = config.playing;
    }

    if (config?.currentIndex !== undefined) {
      setFrame(this, config.currentIndex);
    }
  }
}
