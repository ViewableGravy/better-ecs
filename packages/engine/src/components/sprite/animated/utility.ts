
/**
 * @fileoverview
 * 
 * AnimatedSprite functionality.
 * 
 * Components should not have functionality associated with them and as such, this file provides utility functions for working
 * with the AnimatedSprite component in engine. These can also be used to manually perform operations on AnimatedSprite that
 * may be convenient in userland.
 * 
 * Exported functions include:
 * - `setFrame`
 * - `reset`
 * - `update`
 * 
  * @packageDocumentation
 */

import type { AnimatedSprite } from "@components/sprite/animated/component";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type InternalAnimatedSprite = {
  accumulatedMs: number;
  completed: boolean;
};

/**********************************************************************************************************
 *   CONSTANTS
 **********************************************************************************************************/
const DEFAULT_FRAME_TIME_MS = 1000 / 60;

/**********************************************************************************************************
 *   FUNCTIONS
 **********************************************************************************************************/

/**
 * Sets the current frame of the given animated sprite to the specified index, normalizing it according to the
 * sprite's looping behavior. This will update the sprite's `assetId` to match the new frame and call `onFrameChange`
 * if the frame actually changes.
 * 
 * @param sprite - The animated sprite whose current frame should be changed. 
 * @param index - The index of the frame to change to. If looping is enabled, this will be normalized to a valid frame index.
 */
export function setFrame(sprite: AnimatedSprite, index: number): void {
  const normalizedIndex = normalizeIndex(sprite, index);
  sprite.currentIndex = normalizedIndex;
  sprite.assetId = sprite.frames[normalizedIndex];
  sprite.onFrameChange?.(sprite, sprite.assetId, normalizedIndex);
}

/**
 * Resets the given animated sprite to the beginning of its animation, resets internal playback state, and starts playback.
 * This will set the current frame to the first frame and call `onFrameChange` if the sprite was not already on the first frame.
 * It will also reset internal state so that any subsequent calls to `update` will treat the animation as just having started.
 * If the animation was previously completed (for non‑looping sprites), this will allow it to be played again from the start.
 * 
 * @param sprite - The animated sprite to reset.
 */
export function reset(sprite: AnimatedSprite): void {
  const internal = toInternalAnimatedSprite(sprite);
  internal.accumulatedMs = 0;
  internal.completed = false;
  sprite.playing = true;
  setFrame(sprite, 0);
}

/**
 * Advances the given animated sprite's current frame based on the elapsed time since the last update and the sprite's playback rate. This should be called every frame with the time delta to ensure the animation progresses.
 * The function will accumulate elapsed time and advance the frame index by the appropriate number of frames when enough time has passed, according to the default frame time (assuming 60 FPS) and the sprite's playback rate.
 * For looping sprites, the frame index will wrap around to the beginning when it exceeds the number of frames. For non‑looping sprites, the frame index will clamp to the last frame, and playback will stop once the end is reached.
 * The function also handles calling `onLoop` and `onComplete` callbacks at the appropriate times based on the sprite's looping behavior and when it reaches the end of its animation.
 * 
 * @param sprite - The animated sprite to update.
 * @param deltaMs - The time in milliseconds since the last update. This should be a positive number representing elapsed time.
 */
export function update(sprite: AnimatedSprite, deltaMs: number): void {
  if (!sprite.playing) {
    return;
  }

  if (deltaMs <= 0) {
    return;
  }

  const scaledDelta = deltaMs * sprite.playbackRate;
  if (scaledDelta <= 0) {
    return;
  }

  const internal = toInternalAnimatedSprite(sprite);
  internal.accumulatedMs += scaledDelta;

  const frameSteps = Math.floor(internal.accumulatedMs / DEFAULT_FRAME_TIME_MS);
  if (frameSteps <= 0) {
    return;
  }

  internal.accumulatedMs -= frameSteps * DEFAULT_FRAME_TIME_MS;
  advance(sprite, frameSteps);
}

/**********************************************************************************************************
 *   INTERNAL FUNCTIONS
 **********************************************************************************************************/
function toInternalAnimatedSprite(sprite: AnimatedSprite): InternalAnimatedSprite {
  return sprite as unknown as InternalAnimatedSprite;
}

function normalizeIndex(sprite: AnimatedSprite, index: number): number {
  if (sprite.loop) {
    const count = sprite.frames.length;
    return ((index % count) + count) % count;
  }

  if (index <= 0) {
    return 0;
  }

  return Math.min(index, sprite.frames.length - 1);
}

/**
 * Advances the given animated sprite by a specified number of frame steps.
 *
 * For looping sprites, it wraps around to the start and calls `onLoop` when
 * the animation passes the last frame. For non‑looping sprites, it clamps the
 * index to the final frame, stops playback, marks the animation complete
 * internally, and calls `onComplete` exactly once when the end is reached.
 *
 * @param sprite - The animated sprite whose current frame should be advanced.
 * @param frameSteps - How many frames to advance the sprite by.
 */
function advance(sprite: AnimatedSprite, frameSteps: number): void {
  if (sprite.frames.length <= 1) {
    return;
  }

  if (sprite.loop) {
    const nextIndex = (sprite.currentIndex + frameSteps) % sprite.frames.length;
    const wrapped = sprite.currentIndex + frameSteps >= sprite.frames.length;
    setFrame(sprite, nextIndex);

    if (wrapped) {
      sprite.onLoop?.(sprite);
    }

    return;
  }

  const nextIndex = Math.min(sprite.currentIndex + frameSteps, sprite.frames.length - 1);
  setFrame(sprite, nextIndex);

  if (nextIndex === sprite.frames.length - 1) {
    sprite.playing = false;

    const internal = toInternalAnimatedSprite(sprite);
    if (!internal.completed) {
      internal.completed = true;
      sprite.onComplete?.(sprite);
    }
  }
}
