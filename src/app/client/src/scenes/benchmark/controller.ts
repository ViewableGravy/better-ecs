import { RENDER_LAYERS } from "@client/consts";
import {
  BENCHMARK_ENTITY_COUNTS,
  BENCHMARK_PROFILE_ID,
  DEFAULT_BENCHMARK_SAMPLE_FRAMES,
  DEFAULT_BENCHMARK_TIMEOUT_MS,
  DEFAULT_BENCHMARK_WARMUP_FRAMES,
  type BenchmarkEntityCount,
  requireBenchmarkEntityCount,
} from "@client/scenes/benchmark/config";
import { deriveFrameStats } from "@client/scenes/benchmark/metrics";
import type {
  BenchmarkRunOptions,
  BenchmarkRunResult,
  BenchmarkStatus,
} from "@client/scenes/benchmark/types";
import type { AnyEngine, EntityId, UserWorld } from "@engine";
import { Sprite, Transform2D } from "@engine/components";
import { getEntityIndex } from "@engine/ecs/entity";

const CONSTRUCTION_CHUNK_SIZE = 5_000;
const MOVING_ENTITY_STRIDE = 2;
const MOVE_AMPLITUDE = 5;
const MOVE_TICKS_PER_CYCLE = 120;

type StatusListener = (status: BenchmarkStatus) => void;

export class BenchmarkController {
  readonly #world: UserWorld;
  readonly #engine: AnyEngine;
  readonly #entityIds: EntityId[] = [];
  readonly #transforms: Transform2D[] = [];
  readonly #movingTransforms: Transform2D[] = [];
  #movingBaseX = new Float32Array(0);
  #phase: BenchmarkStatus["phase"] = "idle";
  #requestedCount: BenchmarkEntityCount = BENCHMARK_ENTITY_COUNTS[0];
  #constructionCpuMs = 0;
  #constructionWallMs = 0;
  #motionUpdates = 0;
  #error: string | null = null;
  #lastResult: BenchmarkRunResult | null = null;
  #statusListener: StatusListener = () => undefined;
  readonly #abortController = new AbortController();

  public constructor(world: UserWorld, engine: AnyEngine) {
    this.#world = world;
    this.#engine = engine;
  }

  public setStatusListener(listener: StatusListener): void {
    this.#statusListener = listener;
    this.#emitStatus();
  }

  public status(): BenchmarkStatus {
    return {
      profileId: BENCHMARK_PROFILE_ID,
      phase: this.#phase,
      requestedCount: this.#requestedCount,
      createdCount: this.#entityIds.length,
      lastEntityIndex: this.#entityIds.length === 0
        ? null
        : getEntityIndex(this.#entityIds[this.#entityIds.length - 1]),
      animatedCount: this.#movingTransforms.length,
      constructionCpuMs: this.#constructionCpuMs,
      constructionWallMs: this.#constructionWallMs,
      error: this.#error,
    };
  }

  public result(): BenchmarkRunResult | null {
    return this.#lastResult;
  }

  public dispose(): void {
    this.#abortController.abort();
  }

  public async configure(value: number): Promise<BenchmarkStatus> {
    const targetCount = requireBenchmarkEntityCount(value);

    if (this.#phase === "constructing" || this.#phase === "warming-up" || this.#phase === "sampling") {
      throw new Error(`Cannot configure the benchmark while it is ${this.#phase}.`);
    }

    this.#requestedCount = targetCount;
    this.#phase = "constructing";
    this.#error = null;
    this.#lastResult = null;
    this.#constructionCpuMs = 0;
    this.#emitStatus();

    const startedAt = performance.now();

    try {
      if (targetCount < this.#entityIds.length) {
        this.#constructionCpuMs = measureDuration(() => this.#shrinkTo(targetCount));
      } else {
        await this.#growTo(targetCount);
      }

      this.#constructionWallMs = performance.now() - startedAt;
      this.#phase = "ready";
      this.#emitStatus();
      return this.status();
    } catch (error) {
      this.#constructionWallMs = performance.now() - startedAt;
      this.#phase = "failed";
      this.#error = error instanceof Error ? error.message : String(error);
      this.#emitStatus();
      throw error;
    }
  }

  public async run(value: number, options: BenchmarkRunOptions = {}): Promise<BenchmarkRunResult> {
    try {
      return await this.#run(value, options);
    } catch (error) {
      this.#phase = "failed";
      this.#error = error instanceof Error ? error.message : String(error);
      this.#emitStatus();
      throw error;
    }
  }

  async #run(value: number, options: BenchmarkRunOptions): Promise<BenchmarkRunResult> {
    const targetCount = requireBenchmarkEntityCount(value);
    const warmupFrames = options.warmupFrames ?? DEFAULT_BENCHMARK_WARMUP_FRAMES;
    const sampleFrames = options.sampleFrames ?? DEFAULT_BENCHMARK_SAMPLE_FRAMES;
    const timeoutMs = options.timeoutMs ?? DEFAULT_BENCHMARK_TIMEOUT_MS;

    if (this.#requestedCount !== targetCount || this.#entityIds.length !== targetCount) {
      await this.configure(targetCount);
    }

    this.#assertReady(targetCount);
    this.#phase = "warming-up";
    this.#emitStatus();
    const warmup = await captureFrameDurations(
      warmupFrames,
      timeoutMs,
      this.#abortController.signal,
    );
    if (warmup.timedOut) {
      throw new Error(`Warmup captured ${warmup.durations.length}/${warmupFrames} frames before timeout.`);
    }

    this.#phase = "sampling";
    this.#emitStatus();

    const tickBefore = this.#engine.meta.updateTick;
    const motionUpdatesBefore = this.#motionUpdates;
    const checksumBefore = this.checksum();
    const capture = await captureFrameDurations(
      sampleFrames,
      timeoutMs,
      this.#abortController.signal,
    );
    const checksumAfter = this.checksum();

    const result: BenchmarkRunResult = {
      profileId: BENCHMARK_PROFILE_ID,
      targetCount,
      createdCount: this.#entityIds.length,
      animatedCount: this.#movingTransforms.length,
      constructionCpuMs: this.#constructionCpuMs,
      constructionWallMs: this.#constructionWallMs,
      updateTicks: this.#engine.meta.updateTick - tickBefore,
      motionUpdates: this.#motionUpdates - motionUpdatesBefore,
      checksumBefore,
      checksumAfter,
      raf: deriveFrameStats(capture.durations, sampleFrames, capture.timedOut),
    };

    this.#lastResult = result;
    this.#phase = "ready";
    this.#emitStatus();
    return result;
  }

  public update(updateTick: number): void {
    const angle = (updateTick % MOVE_TICKS_PER_CYCLE) / MOVE_TICKS_PER_CYCLE * Math.PI * 2;
    const offset = Math.sin(angle) * MOVE_AMPLITUDE;

    this.#engine.serialization.suspendTracking(() => {
      for (let index = 0; index < this.#movingTransforms.length; index += 1) {
        const transform = this.#movingTransforms[index];
        transform.curr.pos.x = this.#movingBaseX[index] + offset;
      }
    });
    this.#motionUpdates += 1;
  }

  public checksum(): number {
    const count = this.#movingTransforms.length;
    if (count === 0) {
      return 0;
    }

    const middle = Math.floor(count / 2);
    return (
      this.#movingTransforms[0].curr.pos.x
      + this.#movingTransforms[middle].curr.pos.x
      + this.#movingTransforms[count - 1].curr.pos.x
    );
  }

  #assertReady(targetCount: BenchmarkEntityCount): void {
    if (this.#phase !== "ready") {
      throw new Error(`Benchmark must be ready before sampling. Current phase: ${this.#phase}.`);
    }

    if (this.#entityIds.length !== targetCount) {
      throw new Error(`Created ${this.#entityIds.length} of ${targetCount} requested entities.`);
    }

    const expectedAnimatedCount = Math.ceil(targetCount / MOVING_ENTITY_STRIDE);
    if (this.#movingTransforms.length !== expectedAnimatedCount) {
      throw new Error(
        `Expected ${expectedAnimatedCount} animated entities, found ${this.#movingTransforms.length}.`,
      );
    }
  }

  async #growTo(targetCount: BenchmarkEntityCount): Promise<void> {
    this.#ensureMovingBaseCapacity(Math.ceil(targetCount / MOVING_ENTITY_STRIDE));
    const layout = resolveGridLayout(targetCount);
    this.#applyLayout(layout);

    while (this.#entityIds.length < targetCount) {
      const chunkEnd = Math.min(this.#entityIds.length + CONSTRUCTION_CHUNK_SIZE, targetCount);

      this.#constructionCpuMs += measureDuration(() => this.#engine.serialization.suspendTracking(() => {
        while (this.#entityIds.length < chunkEnd) {
          this.#spawnEntity(this.#entityIds.length, layout);
        }
      }));

      this.#emitStatus();
      if (this.#entityIds.length < targetCount) {
        await nextAnimationFrame(this.#abortController.signal);
      }
    }
  }

  #spawnEntity(index: number, layout: GridLayout): void {
    const column = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    const x = layout.startX + column * layout.stepX;
    const y = layout.startY + row * layout.stepY;
    const entityId = this.#world.create();
    const transform = new Transform2D(x, y);
    const sprite = new Sprite("iron-gear:small", 3, 3);
    const isMoving = index % MOVING_ENTITY_STRIDE === 0;

    sprite.layer = RENDER_LAYERS.world;
    sprite.zOrder = 0.3;
    sprite.isDynamic = isMoving;

    this.#world.add(entityId, transform);
    this.#world.add(entityId, sprite);
    this.#entityIds.push(entityId);
    this.#transforms.push(transform);

    if (!isMoving) {
      return;
    }

    const movingIndex = this.#movingTransforms.length;
    this.#movingTransforms.push(transform);
    this.#movingBaseX[movingIndex] = x;
  }

  #shrinkTo(targetCount: BenchmarkEntityCount): void {
    this.#engine.serialization.suspendTracking(() => {
      while (this.#entityIds.length > targetCount) {
        const entityId = this.#entityIds.pop();
        if (entityId === undefined) {
          throw new Error("Benchmark entity list became inconsistent while shrinking.");
        }
        this.#world.destroy(entityId);
        this.#transforms.pop();
      }
    });

    this.#movingTransforms.length = Math.ceil(targetCount / MOVING_ENTITY_STRIDE);
  }

  #applyLayout(layout: GridLayout): void {
    for (let index = 0; index < this.#transforms.length; index += 1) {
      const transform = this.#transforms[index];
      const column = index % layout.columns;
      const row = Math.floor(index / layout.columns);
      const x = layout.startX + column * layout.stepX;
      const y = layout.startY + row * layout.stepY;

      transform.curr.pos.set(x, y);
      transform.prev.pos.set(x, y);

      if (index % MOVING_ENTITY_STRIDE === 0) {
        this.#movingBaseX[Math.floor(index / MOVING_ENTITY_STRIDE)] = x;
      }
    }
  }

  #ensureMovingBaseCapacity(required: number): void {
    if (this.#movingBaseX.length >= required) {
      return;
    }

    const next = new Float32Array(required);
    next.set(this.#movingBaseX);
    this.#movingBaseX = next;
  }

  #emitStatus(): void {
    this.#statusListener(this.status());
  }
}

type GridLayout = {
  columns: number;
  startX: number;
  startY: number;
  stepX: number;
  stepY: number;
};

function resolveGridLayout(targetCount: number): GridLayout {
  const safeHeight = 300 * 2 * 0.9;
  const safeWidth = safeHeight * window.innerWidth / window.innerHeight;
  const columns = Math.max(1, Math.ceil(Math.sqrt(targetCount * safeWidth / safeHeight)));
  const rows = Math.ceil(targetCount / columns);

  return {
    columns,
    startX: -safeWidth * 0.5,
    startY: -safeHeight * 0.5,
    stepX: columns === 1 ? 0 : safeWidth / (columns - 1),
    stepY: rows === 1 ? 0 : safeHeight / (rows - 1),
  };
}

function nextAnimationFrame(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    window.requestAnimationFrame(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    });
  });
}

async function captureFrameDurations(
  requestedFrames: number,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<{ durations: number[]; timedOut: boolean }> {
  signal.throwIfAborted();

  if (!Number.isInteger(requestedFrames) || requestedFrames < 1) {
    throw new Error(`Frame count must be a positive integer. Received ${requestedFrames}.`);
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Timeout must be positive. Received ${timeoutMs}.`);
  }

  return new Promise((resolve, reject) => {
    const durations: number[] = [];
    let lastFrameAt: number | null = null;
    let completed = false;

    const abort = (): void => {
      if (completed) {
        return;
      }

      completed = true;
      window.clearTimeout(timeoutHandle);
      reject(signal.reason);
    };

    const finish = (timedOut: boolean): void => {
      if (completed) {
        return;
      }

      completed = true;
      window.clearTimeout(timeoutHandle);
      signal.removeEventListener("abort", abort);
      resolve({ durations, timedOut });
    };

    const capture = (now: number): void => {
      if (completed) {
        return;
      }

      if (lastFrameAt !== null) {
        durations.push(now - lastFrameAt);
      }
      lastFrameAt = now;

      if (durations.length >= requestedFrames) {
        finish(false);
        return;
      }

      window.requestAnimationFrame(capture);
    };

    const timeoutHandle = window.setTimeout(() => finish(true), timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    window.requestAnimationFrame(capture);
  });
}

function measureDuration(callback: () => void): number {
  const startedAt = performance.now();
  callback();
  return performance.now() - startedAt;
}
