
import type { AnimatedSprite } from "@engine/components/sprite/animated/component";

const DEFAULT_FRAME_TIME_MS = 1000 / 60;
const GLOBAL_ANIMATION_START_TIME_MS = performance.now();
const GLOBAL_ANIMATION_START_TICK = 0;

/**
 * Returns the current animation frame index for the provided render sample.
 *
 * This function is pure: it reads component state and the current time/tick sample,
 * then derives an index without mutating ECS data.
 *
 * @param sprite - Animated sprite state.
 * @param timeMs - Current time in milliseconds.
 * @param updateTick - Current fixed-step update tick.
 * @returns A normalized frame index in the range `[0, sprite.frames.length - 1]`.
 */
export function getFrameIndexAtTime(
  sprite: AnimatedSprite,
  timeMs: number,
  updateTick: number = GLOBAL_ANIMATION_START_TICK,
): number {
  const duration = sprite.frames.length;
  if (duration <= 1) {
    return 0;
  }

  const sampledFrame = sprite.playbackMode === "tick"
    ? getSampledFrameAtTick(sprite, updateTick)
    : getSampledFrameAtTime(sprite, timeMs);
  const wrappedFrame = ((sampledFrame % duration) + duration) % duration;
  return Math.floor(wrappedFrame);
}

/**
 * Returns the frame asset id for the provided render sample.
 *
 * @param sprite - Animated sprite state.
 * @param timeMs - Current time in milliseconds.
 * @param updateTick - Current fixed-step update tick.
 * @returns The asset id of the sampled frame.
 */
export function getFrameAssetIdAtTime(
  sprite: AnimatedSprite,
  timeMs: number,
  updateTick: number = GLOBAL_ANIMATION_START_TICK,
): AnimatedSprite["frames"][number] {
  return sprite.frames[getFrameIndexAtTime(sprite, timeMs, updateTick)];
}

function getSampledFrameAtTime(sprite: AnimatedSprite, timeMs: number): number {
  const startTime = sprite.useGlobalOffset ? GLOBAL_ANIMATION_START_TIME_MS : sprite.startTime;
  const elapsedMs = timeMs - startTime;

  return (elapsedMs * sprite.playbackRate) / DEFAULT_FRAME_TIME_MS;
}

function getSampledFrameAtTick(sprite: AnimatedSprite, updateTick: number): number {
  const startTick = sprite.useGlobalOffset ? GLOBAL_ANIMATION_START_TICK : sprite.startTick;
  const elapsedTicks = updateTick - startTick;

  return elapsedTicks * sprite.playbackRate;
}
