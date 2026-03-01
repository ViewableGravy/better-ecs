
import type { AnimatedSprite } from "@components/sprite/animated/component";

const DEFAULT_FRAME_TIME_MS = 1000 / 60;
const GLOBAL_ANIMATION_START_TIME_MS = performance.now();

/**
 * Returns the current animation frame index for the provided time.
 *
 * This function is pure: it reads component state and time, then derives an index
 * without mutating ECS data.
 *
 * @param sprite - Animated sprite state.
 * @param timeMs - Current time in milliseconds.
 * @returns A normalized frame index in the range `[0, sprite.frames.length - 1]`.
 */
export function getFrameIndexAtTime(sprite: AnimatedSprite, timeMs: number): number {
  const duration = sprite.frames.length;
  if (duration <= 1) {
    return 0;
  }

  const startTime = sprite.useGlobalOffset ? GLOBAL_ANIMATION_START_TIME_MS : sprite.startTime;
  const elapsedMs = timeMs - startTime;
  // Convert elapsed milliseconds to 60 FPS frame steps before sampling.
  const sampledFrame = (elapsedMs * sprite.playbackRate) / DEFAULT_FRAME_TIME_MS;
  const wrappedFrame = ((sampledFrame % duration) + duration) % duration;
  return Math.floor(wrappedFrame);
}

/**
 * Returns the frame asset id for the provided time.
 *
 * @param sprite - Animated sprite state.
 * @param timeMs - Current time in milliseconds.
 * @returns The asset id of the sampled frame.
 */
export function getFrameAssetIdAtTime(
  sprite: AnimatedSprite,
  timeMs: number,
): AnimatedSprite["frames"][number] {
  return sprite.frames[getFrameIndexAtTime(sprite, timeMs)];
}
