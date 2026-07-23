import { deriveFrameStats } from "@client/scenes/benchmark/metrics";
import { describe, expect, it } from "vitest";

describe("deriveFrameStats", () => {
  it("derives stable frame distribution metrics", () => {
    const result = deriveFrameStats([10, 20, 30, 40, 60], 5, false);

    expect(result).toMatchObject({
      requestedFrames: 5,
      capturedFrames: 5,
      durationMs: 160,
      frameTimeAverageMs: 32,
      frameTimeMedianMs: 30,
      frameTimeP95Ms: 40,
      frameTimeP99Ms: 40,
      frameTimeMaxMs: 60,
      framesOver16_7Ms: 4,
      framesOver33_3Ms: 2,
      framesOver50Ms: 1,
      timedOut: false,
    });
  });

  it("reports an empty timed-out sample without invalid numbers", () => {
    const result = deriveFrameStats([], 240, true);

    expect(result.capturedFrames).toBe(0);
    expect(result.fpsAverage).toBe(0);
    expect(result.frameTimeP99Ms).toBe(0);
    expect(result.timedOut).toBe(true);
  });
});
