import { describe, expect, it } from "vitest";

import { BENCHMARK_QUERY_SELECTIVE_STRIDE } from "@client/scenes/benchmark/config";
import { QueryBenchmark } from "@client/scenes/benchmark/query-benchmark";
import { BenchmarkQueryMarker } from "@client/scenes/benchmark/query-marker";
import { Registry } from "@engine";
import { Sprite, Transform2D } from "@engine/components";

describe("QueryBenchmark", () => {
  it("compares equivalent dense and selective traversals", () => {
    const world = new Registry();
    const benchmark = new QueryBenchmark(world);
    const entityCount = 20;

    for (let index = 0; index < entityCount; index += 1) {
      const entityId = world.create();
      world.add(entityId, new Transform2D(index, 0));

      world.add(entityId, new Sprite("test", 1, 1));
    }

    const entityIds = world.all();
    benchmark.prepareSelectiveLayout(entityIds);
    const result = benchmark.measure(entityCount);
    benchmark.clearSelectiveLayout(entityIds);

    expect(result.dense.matchedCount).toBe(entityCount);
    expect(result.selective.matchedCount).toBe(
      Math.ceil(entityCount / BENCHMARK_QUERY_SELECTIVE_STRIDE),
    );
    expect(world.query(BenchmarkQueryMarker)).toEqual([]);

    for (const layout of [result.dense, result.selective]) {
      const strategies = Object.values(layout.strategies);
      const baselineChecksum = layout.strategies.forEach.checksum;
      expect(strategies.every((strategy) => Number.isFinite(strategy.nanosecondsPerMatch))).toBe(true);
      expect(strategies.every((strategy) => strategy.checksum === baselineChecksum)).toBe(true);
    }
  });
});
