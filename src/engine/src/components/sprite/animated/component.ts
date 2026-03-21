import { Sprite } from "@engine/components/sprite/sprite";
import type { RegisteredAssets } from "@engine/core";
import { StateComponent, state } from "@engine/serialization";

type SpriteAssetId = Exclude<keyof RegisteredAssets, number | symbol>;
const DESERIALIZED_ANIMATED_SPRITE_FRAME_PLACEHOLDER = "" as SpriteAssetId;

type AnimatedSpriteConfig = {
  assets: readonly SpriteAssetId[];
  width?: number;
  height?: number;
  anchorX?: number;
  anchorY?: number;
  flipX?: boolean;
  flipY?: boolean;
  zOrder?: number;
  layer?: number;
  isDynamic?: boolean;
  playbackRate?: number;
  startTime?: number;
  useGlobalOffset?: boolean;
};

function isAnimatedSpriteConfig(
  value: AnimatedSpriteConfig | readonly SpriteAssetId[],
): value is AnimatedSpriteConfig {
  return !Array.isArray(value);
}

@StateComponent
export class AnimatedSprite extends Sprite {
  @state("json")
  declare public readonly frames: readonly SpriteAssetId[];

  @state("float")
  declare public playbackRate: number;

  @state("float")
  declare public startTime: number;

  @state("boolean")
  declare public useGlobalOffset: boolean;

  constructor();
  constructor(frames: readonly SpriteAssetId[]);
  constructor(config: AnimatedSpriteConfig);
  constructor(configOrFrames?: AnimatedSpriteConfig | readonly SpriteAssetId[]) {
    let config: AnimatedSpriteConfig | undefined;
    let frames: readonly SpriteAssetId[];

    if (configOrFrames === undefined) {
      frames = [DESERIALIZED_ANIMATED_SPRITE_FRAME_PLACEHOLDER];
    } else if (isAnimatedSpriteConfig(configOrFrames)) {
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
      config?.zOrder,
      config?.layer,
      config?.isDynamic,
    );

    this.frames = frames;
    this.playbackRate = 1;
    this.startTime = performance.now();
    this.useGlobalOffset = false;

    if (config?.playbackRate !== undefined) {
      this.playbackRate = config.playbackRate;
    }

    if (config?.startTime !== undefined) {
      this.startTime = config.startTime;
    }

    if (config?.useGlobalOffset !== undefined) {
      this.useGlobalOffset = config.useGlobalOffset;
    }
  }
}
