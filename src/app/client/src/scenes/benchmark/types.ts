import type { BENCHMARK_PROFILE_ID, BenchmarkEntityCount } from "@client/scenes/benchmark/config";

export type BenchmarkPhase =
  | "idle"
  | "constructing"
  | "ready"
  | "warming-up"
  | "sampling"
  | "failed";

export type BenchmarkStatus = {
  profileId: typeof BENCHMARK_PROFILE_ID;
  phase: BenchmarkPhase;
  requestedCount: BenchmarkEntityCount;
  createdCount: number;
  lastEntityIndex: number | null;
  animatedCount: number;
  constructionCpuMs: number;
  constructionWallMs: number;
  error: string | null;
};

export type BenchmarkRunOptions = {
  warmupFrames?: number;
  sampleFrames?: number;
  timeoutMs?: number;
};

export type BenchmarkRafStats = {
  requestedFrames: number;
  capturedFrames: number;
  durationMs: number;
  fpsAverage: number;
  frameTimeAverageMs: number;
  frameTimeMedianMs: number;
  frameTimeP95Ms: number;
  frameTimeP99Ms: number;
  frameTimeMaxMs: number;
  framesOver16_7Ms: number;
  framesOver33_3Ms: number;
  framesOver50Ms: number;
  timedOut: boolean;
};

export type BenchmarkRunResult = {
  profileId: typeof BENCHMARK_PROFILE_ID;
  targetCount: BenchmarkEntityCount;
  createdCount: number;
  animatedCount: number;
  constructionCpuMs: number;
  constructionWallMs: number;
  updateTicks: number;
  motionUpdates: number;
  checksumBefore: number;
  checksumAfter: number;
  raf: BenchmarkRafStats;
};

export type BenchmarkHarness = {
  targets: readonly BenchmarkEntityCount[];
  configure: (count: number) => Promise<BenchmarkStatus>;
  run: (count: number, options?: BenchmarkRunOptions) => Promise<BenchmarkRunResult>;
  status: () => BenchmarkStatus;
  result: () => BenchmarkRunResult | null;
};
