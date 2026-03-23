import { AnimatedSprite } from "@engine/components/sprite/animated/component";
import { getFrameIndexAtTime } from "@engine/components/sprite/animated/utility";
import { describe, expect, it } from "vitest";

describe("AnimatedSprite playback timing", () => {
  it("samples time-based playback from elapsed milliseconds", () => {
    const sprite = new AnimatedSprite({
      assets: ["frame-a", "frame-b", "frame-c", "frame-d"],
      playbackRate: 1,
      playbackMode: "time",
      startTime: 0,
    });

    expect(getFrameIndexAtTime(sprite, 0, 0)).toBe(0);
    expect(getFrameIndexAtTime(sprite, 16.7, 0)).toBe(1);
    expect(getFrameIndexAtTime(sprite, 33.4, 0)).toBe(2);
  });

  it("samples tick-based playback from elapsed update ticks", () => {
    const sprite = new AnimatedSprite({
      assets: ["frame-a", "frame-b", "frame-c", "frame-d"],
      playbackRate: 0.25,
      playbackMode: "tick",
      startTick: 10,
    });

    expect(getFrameIndexAtTime(sprite, 0, 10)).toBe(0);
    expect(getFrameIndexAtTime(sprite, 0, 13)).toBe(0);
    expect(getFrameIndexAtTime(sprite, 0, 14)).toBe(1);
    expect(getFrameIndexAtTime(sprite, 0, 18)).toBe(2);
  });
});