import type { BenchmarkRafStats } from "@client/scenes/benchmark/types";

export function deriveFrameStats(
  frameDurationsMs: readonly number[],
  requestedFrames: number,
  timedOut: boolean,
): BenchmarkRafStats {
  const sorted = [...frameDurationsMs].sort((left, right) => left - right);
  const durationMs = frameDurationsMs.reduce((sum, value) => sum + value, 0);
  const capturedFrames = frameDurationsMs.length;
  const frameTimeAverageMs = capturedFrames === 0 ? 0 : durationMs / capturedFrames;

  return {
    requestedFrames,
    capturedFrames,
    durationMs,
    fpsAverage: frameTimeAverageMs === 0 ? 0 : 1000 / frameTimeAverageMs,
    frameTimeAverageMs,
    frameTimeMedianMs: percentile(sorted, 0.5),
    frameTimeP95Ms: percentile(sorted, 0.95),
    frameTimeP99Ms: percentile(sorted, 0.99),
    frameTimeMaxMs: sorted.at(-1) ?? 0,
    framesOver16_7Ms: countAbove(frameDurationsMs, 16.7),
    framesOver33_3Ms: countAbove(frameDurationsMs, 33.3),
    framesOver50Ms: countAbove(frameDurationsMs, 50),
    timedOut,
  };
}

function percentile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.floor((sortedValues.length - 1) * ratio);
  return sortedValues[index] ?? 0;
}

function countAbove(values: readonly number[], threshold: number): number {
  let count = 0;

  for (const value of values) {
    if (value > threshold) {
      count += 1;
    }
  }

  return count;
}
