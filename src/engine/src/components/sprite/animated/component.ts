import { Sprite } from "@engine/components/sprite/sprite";
import type { RegisteredAssets } from "@engine/core";

type SpriteAssetId = Exclude<keyof RegisteredAssets, number | symbol>;

export type AnimatedSpritePlaybackMode = "time" | "tick";
export type AnimatedSpriteFrameSelectionMode = "cpu" | "shader";

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
  playbackMode?: AnimatedSpritePlaybackMode;
  startTime?: number;
  startTick?: number;
  useGlobalOffset?: boolean;
  frameSelectionMode?: AnimatedSpriteFrameSelectionMode;
};

function isAnimatedSpriteConfig(
  value: AnimatedSpriteConfig | readonly SpriteAssetId[],
): value is AnimatedSpriteConfig {
  return !Array.isArray(value);
}
export class AnimatedSprite extends Sprite {
  declare public readonly frames: readonly SpriteAssetId[];
  declare public playbackRate: number;
  declare public playbackMode: AnimatedSpritePlaybackMode;
  declare public startTime: number;
  declare public startTick: number;
  declare public useGlobalOffset: boolean;
  /**
   * Selects whether frame changes are projected through ECS or selected once per retained draw bucket.
   *
   * Shader selection currently requires tick playback and every frame to share one texture source.
   */
  declare public frameSelectionMode: AnimatedSpriteFrameSelectionMode;

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
      config?.zOrder,
      config?.layer,
      config?.isDynamic,
    );

    this.frames = frames;
    this.playbackRate = 1;
    this.playbackMode = "time";
    this.startTime = performance.now();
    this.startTick = 0;
    this.useGlobalOffset = false;
    this.frameSelectionMode = "cpu";

    if (config?.playbackRate !== undefined) {
      this.playbackRate = config.playbackRate;
    }

    if (config?.playbackMode !== undefined) {
      this.playbackMode = config.playbackMode;
    }

    if (config?.startTime !== undefined) {
      this.startTime = config.startTime;
    }

    if (config?.startTick !== undefined) {
      this.startTick = config.startTick;
    }

    if (config?.useGlobalOffset !== undefined) {
      this.useGlobalOffset = config.useGlobalOffset;
    }

    if (config?.frameSelectionMode !== undefined) {
      this.frameSelectionMode = config.frameSelectionMode;
    }
  }
}
