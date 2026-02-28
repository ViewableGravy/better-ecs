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

const DEFAULT_FRAME_TIME_MS = 1000 / 60;

export class AnimatedSprite extends Sprite {
  public readonly frames: readonly SpriteAssetId[];

  public currentIndex = 0;
  public loop = true;
  public playbackRate = 1;
  public playing = true;

  public onFrameChange: ((sprite: AnimatedSprite, nextAssetId: SpriteAssetId, nextIndex: number) => void) | null = null;
  public onLoop: ((sprite: AnimatedSprite) => void) | null = null;
  public onComplete: ((sprite: AnimatedSprite) => void) | null = null;

  #accumulatedMs = 0;
  #completed = false;

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
      this.setFrame(config.currentIndex);
    }
  }

  public setFrame(index: number): void {
    const normalizedIndex = this.#normalizeIndex(index);
    this.currentIndex = normalizedIndex;
    this.assetId = this.frames[normalizedIndex];
    this.onFrameChange?.(this, this.assetId, normalizedIndex);
  }

  public reset(): void {
    this.#accumulatedMs = 0;
    this.#completed = false;
    this.playing = true;
    this.setFrame(0);
  }

  public update(deltaMs: number): void {
    if (!this.playing) {
      return;
    }

    if (deltaMs <= 0) {
      return;
    }

    const scaledDelta = deltaMs * this.playbackRate;
    if (scaledDelta <= 0) {
      return;
    }

    this.#accumulatedMs += scaledDelta;
    const frameSteps = Math.floor(this.#accumulatedMs / DEFAULT_FRAME_TIME_MS);

    if (frameSteps <= 0) {
      return;
    }

    this.#accumulatedMs -= frameSteps * DEFAULT_FRAME_TIME_MS;
    this.#advance(frameSteps);
  }

  #advance(frameSteps: number): void {
    if (this.frames.length <= 1) {
      return;
    }

    if (this.loop) {
      const nextIndex = (this.currentIndex + frameSteps) % this.frames.length;
      const wrapped = this.currentIndex + frameSteps >= this.frames.length;
      this.setFrame(nextIndex);

      if (wrapped) {
        this.onLoop?.(this);
      }

      return;
    }

    const nextIndex = Math.min(this.currentIndex + frameSteps, this.frames.length - 1);
    this.setFrame(nextIndex);

    if (nextIndex === this.frames.length - 1) {
      this.playing = false;

      if (!this.#completed) {
        this.#completed = true;
        this.onComplete?.(this);
      }
    }
  }

  #normalizeIndex(index: number): number {
    if (this.loop) {
      const count = this.frames.length;
      return ((index % count) + count) % count;
    }

    if (index <= 0) {
      return 0;
    }

    return Math.min(index, this.frames.length - 1);
  }
}
