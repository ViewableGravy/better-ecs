export const BENCHMARK_PROFILE_ID = "sprite-dynamic-50";

export const BENCHMARK_ENTITY_COUNTS = [
  10_000,
  100_000,
  500_000,
  1_000_000,
  2_000_000,
  5_000_000,
] as const;

export type BenchmarkEntityCount = (typeof BENCHMARK_ENTITY_COUNTS)[number];

export const DEFAULT_BENCHMARK_ENTITY_COUNT: BenchmarkEntityCount = 10_000;
export const DEFAULT_BENCHMARK_WARMUP_FRAMES = 60;
export const DEFAULT_BENCHMARK_SAMPLE_FRAMES = 240;
export const DEFAULT_BENCHMARK_TIMEOUT_MS = 60_000;
export const BENCHMARK_QUERY_SELECTIVE_STRIDE = 10;

export function requireBenchmarkEntityCount(value: number): BenchmarkEntityCount {
  const target = BENCHMARK_ENTITY_COUNTS.find((candidate) => candidate === value);

  if (target === undefined) {
    throw new Error(
      `Benchmark target must be one of: ${BENCHMARK_ENTITY_COUNTS.join(", ")}. Received ${value}.`,
    );
  }

  return target;
}
