import { BENCHMARK_QUERY_SELECTIVE_STRIDE } from "@legacy/scenes/benchmark/config";
import { BenchmarkQueryMarker } from "@legacy/scenes/benchmark/query-marker";
import type {
  BenchmarkQueryLayoutResult,
  BenchmarkQueryResult,
  BenchmarkQueryStrategyResult,
} from "@legacy/scenes/benchmark/types";
import type { EntityId, QueryCursor2, Registry } from "@engine";
import { Sprite, Transform2D } from "@engine/components";

const TARGET_MATCH_VISITS = 1_000_000;
const MAX_ITERATIONS = 250;

type QueryTuple<TA, TB> = readonly [EntityId<TA & TB>, TA, TB];
type QueryRun = () => number;

export class QueryBenchmark {
  readonly #world: Registry;
  readonly #denseCursor: QueryCursor2<Transform2D, Sprite>;
  readonly #selectiveCursor: QueryCursor2<Transform2D, BenchmarkQueryMarker>;
  readonly #SHARED_SELECTIVE_MARKER = new BenchmarkQueryMarker();

  public constructor(world: Registry) {
    this.#world = world;
    this.#denseCursor = world.createQueryCursor(Transform2D, Sprite);
    this.#selectiveCursor = world.createQueryCursor(Transform2D, BenchmarkQueryMarker);
  }

  public prepareSelectiveLayout(entityIds: readonly EntityId[]): void {
    for (let index = 0; index < entityIds.length; index += BENCHMARK_QUERY_SELECTIVE_STRIDE) {
      const entityId = entityIds[index];
      if (entityId === undefined) {
        throw new Error(`Benchmark entity list is missing entity ${index}`);
      }

      this.#world.add(entityId, this.#SHARED_SELECTIVE_MARKER);
    }
  }

  public clearSelectiveLayout(entityIds: readonly EntityId[]): void {
    for (let index = 0; index < entityIds.length; index += BENCHMARK_QUERY_SELECTIVE_STRIDE) {
      const entityId = entityIds[index];
      if (entityId === undefined) {
        throw new Error(`Benchmark entity list is missing entity ${index}`);
      }

      this.#world.remove(entityId, BenchmarkQueryMarker);
    }
  }

  public measure(entityCount: number): BenchmarkQueryResult {
    const selectiveCount = Math.ceil(entityCount / BENCHMARK_QUERY_SELECTIVE_STRIDE);

    return {
      targetMatchVisits: TARGET_MATCH_VISITS,
      dense: this.#measureLayout(
        "dense",
        entityCount,
        () => this.#countDenseMatches(),
        () => this.#runDenseForEach(),
        () => this.#runDenseCursor(),
        () => this.#runDenseQueryGet(),
        () => this.#runDenseTupleIterator(),
      ),
      selective: this.#measureLayout(
        "selective-10",
        selectiveCount,
        () => this.#countSelectiveMatches(),
        () => this.#runSelectiveForEach(),
        () => this.#runSelectiveCursor(),
        () => this.#runSelectiveQueryGet(),
        () => this.#runSelectiveTupleIterator(),
      ),
    };
  }

  #measureLayout(
    layout: BenchmarkQueryLayoutResult["layout"],
    expectedMatchedCount: number,
    countMatches: QueryRun,
    runForEach: QueryRun,
    runCursor: QueryRun,
    runQueryGet: QueryRun,
    runTupleIterator: QueryRun,
  ): BenchmarkQueryLayoutResult {
    const matchedCount = countMatches();
    if (matchedCount !== expectedMatchedCount) {
      throw new Error(
        `${layout} query fixture matched ${matchedCount} of ${expectedMatchedCount} expected entities`,
      );
    }

    const iterations = Math.min(
      MAX_ITERATIONS,
      Math.max(1, Math.ceil(TARGET_MATCH_VISITS / matchedCount)),
    );

    runForEach();
    runCursor();
    runQueryGet();
    runTupleIterator();

    return {
      layout,
      matchedCount,
      iterations,
      strategies: {
        forEach: measureStrategy(iterations, runForEach, matchedCount),
        cursor: measureStrategy(iterations, runCursor, matchedCount),
        queryGet: measureStrategy(iterations, runQueryGet, matchedCount),
        tupleIterator: measureStrategy(iterations, runTupleIterator, matchedCount),
      },
    };
  }

  #countDenseMatches(): number {
    let count = 0;
    this.#world.forEach(Transform2D, Sprite, () => {
      count += 1;
    });
    return count;
  }

  #countSelectiveMatches(): number {
    let count = 0;
    this.#world.forEach(Transform2D, BenchmarkQueryMarker, () => {
      count += 1;
    });
    return count;
  }

  #runDenseForEach(): number {
    let checksum = 0;
    this.#world.forEach(Transform2D, Sprite, (entityId, transform, sprite) => {
      checksum += entityId + transform.curr.pos.x + sprite.width;
    });
    return checksum;
  }

  #runDenseCursor(): number {
    let checksum = 0;
    for (const row of this.#denseCursor) {
      checksum += row.entityId + row.componentA.curr.pos.x + row.componentB.width;
    }
    return checksum;
  }

  #runDenseQueryGet(): number {
    let checksum = 0;
    for (const entityId of this.#world.query(Transform2D, Sprite)) {
      const transform = this.#world.get(entityId, Transform2D);
      const sprite = this.#world.get(entityId, Sprite);
      checksum += entityId + transform.curr.pos.x + sprite.width;
    }
    return checksum;
  }

  #runDenseTupleIterator(): number {
    let checksum = 0;
    for (const [entityId, transform, sprite] of iterateCursorTuples(this.#denseCursor)) {
      checksum += entityId + transform.curr.pos.x + sprite.width;
    }
    return checksum;
  }

  #runSelectiveForEach(): number {
    let checksum = 0;
    this.#world.forEach(Transform2D, BenchmarkQueryMarker, (entityId, transform, marker) => {
      checksum += entityId + transform.curr.pos.x + marker.value;
    });
    return checksum;
  }

  #runSelectiveCursor(): number {
    let checksum = 0;
    for (const row of this.#selectiveCursor) {
      checksum += row.entityId + row.componentA.curr.pos.x + row.componentB.value;
    }
    return checksum;
  }

  #runSelectiveQueryGet(): number {
    let checksum = 0;
    for (const entityId of this.#world.query(Transform2D, BenchmarkQueryMarker)) {
      const transform = this.#world.get(entityId, Transform2D);
      const marker = this.#world.get(entityId, BenchmarkQueryMarker);
      checksum += entityId + transform.curr.pos.x + marker.value;
    }
    return checksum;
  }

  #runSelectiveTupleIterator(): number {
    let checksum = 0;
    for (const [entityId, transform, marker] of iterateCursorTuples(this.#selectiveCursor)) {
      checksum += entityId + transform.curr.pos.x + marker.value;
    }
    return checksum;
  }
}

function measureStrategy(
  iterations: number,
  run: QueryRun,
  matchedCount: number,
): BenchmarkQueryStrategyResult {
  let checksum = 0;
  const startedAt = performance.now();

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    checksum += run();
  }

  const durationMs = performance.now() - startedAt;
  return {
    durationMs,
    nanosecondsPerMatch: durationMs * 1_000_000 / (iterations * matchedCount),
    checksum,
  };
}

function* iterateCursorTuples<TA, TB>(
  cursor: QueryCursor2<TA, TB>,
): IterableIterator<QueryTuple<TA, TB>> {
  for (const row of cursor) {
    const tuple: QueryTuple<TA, TB> = [row.entityId, row.componentA, row.componentB];
    yield tuple;
  }
}
