import { PlayerComponent } from "@client/components/player";
import { RENDER_LAYERS } from "@client/consts";
import { setupContextPlayer } from "@client/scenes/world/contexts/shared";
import { createSystem, type EntityId, type UserWorld } from "@engine";
import { Sprite, Transform2D } from "@engine/components";
import { Delta, fromContext, World } from "@engine/context";
import { contextId, createContextScene, defineContext } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type BenchmarkHarness = {
  setTargetCount: (count: number) => void;
  getTargetCount: () => number;
  getSpawnedCount: () => number;
  startSample: (durationMs?: number) => void;
  stopSample: () => BenchmarkSample | null;
  getLastSample: () => BenchmarkSample | null;
  isSampling: () => boolean;
  getLayoutSummary: () => BenchmarkLayoutSummary;
};

type BenchmarkSample = {
  durationMs: number;
  frames: number;
  fpsAvg: number;
  frameTimeAvgMs: number;
  frameTimeP95Ms: number;
  frameTimeP99Ms: number;
  frameTimeMinMs: number;
  frameTimeMaxMs: number;
};

type BenchmarkRuntimeState = {
  world: UserWorld | null;
  elapsedMs: number;
  targetCount: number;
  spawnedEntityIds: EntityId[];
  movingTransforms: Transform2D[];
  movingBaseX: number[];
  movingPhase: number[];
  sample: {
    active: boolean;
    endTimeMs: number;
    timeoutHandle: number | null;
    rafHandle: number | null;
    rafLastAtMs: number | null;
    frameDurationsMs: number[];
    lastResult: BenchmarkSample | null;
  };
  layoutSummary: BenchmarkLayoutSummary;
};

type BenchmarkLayoutSummary = {
  viewportWidth: number;
  viewportHeight: number;
  safeWidth: number;
  safeHeight: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

declare global {
  interface Window {
    __BETTER_ECS_BENCH__?: BenchmarkHarness;
    __BETTER_ECS_BENCH_TARGET_COUNT__?: number;
  }
}

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const BENCH_CONTEXT_ID = contextId("benchmark-root");
const DEFAULT_TARGET_COUNT = 10_000;
const MOVE_AMPLITUDE = 5;
const MOVE_SPEED_RAD_PER_MS = 0.0035;
const MOVE_RATIO = 0.5;
const DEFAULT_SAMPLE_DURATION_MS = 5_000;
const MIN_SAMPLE_DURATION_MS = 250;
const MAX_SAMPLE_DURATION_MS = 30_000;

const runtimeState: BenchmarkRuntimeState = {
  world: null,
  elapsedMs: 0,
  targetCount: DEFAULT_TARGET_COUNT,
  spawnedEntityIds: [],
  movingTransforms: [],
  movingBaseX: [],
  movingPhase: [],
  sample: {
    active: false,
    endTimeMs: 0,
    timeoutHandle: null,
    rafHandle: null,
    rafLastAtMs: null,
    frameDurationsMs: [],
    lastResult: null,
  },
  layoutSummary: {
    viewportWidth: 0,
    viewportHeight: 0,
    safeWidth: 0,
    safeHeight: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  },
};

const BenchmarkMotionSystem = createSystem("benchmark:motion")({
  system: animateBenchEntities,
});

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Scene = createContextScene("BenchmarkScene")({
  systems: [BenchmarkMotionSystem],
  contexts: [
    defineContext({
      id: BENCH_CONTEXT_ID,
      policy: {
        visibility: "stack",
        simulation: "focused-only",
      },
      setup(world) {
        setupContextPlayer(world, 0, 0);
      },
    }),
  ],
  setup(_world, manager) {
    manager.ensureWorldLoaded(BENCH_CONTEXT_ID);
    manager.setFocusedContextId(BENCH_CONTEXT_ID);

    const world = manager.requireWorld(BENCH_CONTEXT_ID);
    runtimeState.world = world;
    runtimeState.elapsedMs = 0;

    const requestedCount = sanitizeTargetCount(window.__BETTER_ECS_BENCH_TARGET_COUNT__);
    rebuildBenchmarkWorld(world, requestedCount);

    window.__BETTER_ECS_BENCH__ = {
      setTargetCount(count: number) {
        const nextCount = sanitizeTargetCount(count);
        window.__BETTER_ECS_BENCH_TARGET_COUNT__ = nextCount;

        const activeWorld = runtimeState.world;
        if (!activeWorld) {
          runtimeState.targetCount = nextCount;
          return;
        }

        rebuildBenchmarkWorld(activeWorld, nextCount);
      },
      getTargetCount() {
        return runtimeState.targetCount;
      },
      getSpawnedCount() {
        return runtimeState.spawnedEntityIds.length;
      },
      startSample(durationMs = DEFAULT_SAMPLE_DURATION_MS) {
        const now = performance.now();
        const clampedDurationMs = clampSampleDuration(durationMs);

        if (runtimeState.sample.timeoutHandle !== null) {
          window.clearTimeout(runtimeState.sample.timeoutHandle);
        }

        runtimeState.sample.active = true;
        runtimeState.sample.endTimeMs = now + clampedDurationMs;
        runtimeState.sample.rafLastAtMs = null;
        runtimeState.sample.frameDurationsMs.length = 0;
        runtimeState.sample.lastResult = null;
        runtimeState.sample.timeoutHandle = window.setTimeout(() => {
          finalizeSample(performance.now());
        }, clampedDurationMs + 16);

        scheduleSampleFrame();
      },
      stopSample() {
        if (!runtimeState.sample.active) {
          return runtimeState.sample.lastResult;
        }

        finalizeSample(performance.now());
        return runtimeState.sample.lastResult;
      },
      getLastSample() {
        return runtimeState.sample.lastResult;
      },
      isSampling() {
        return runtimeState.sample.active;
      },
      getLayoutSummary() {
        return runtimeState.layoutSummary;
      },
    };
  },
});

function animateBenchEntities(): void {
  const world = fromContext(World);
  if (runtimeState.world !== world) {
    return;
  }

  const [updateDelta] = fromContext(Delta);
  runtimeState.elapsedMs += updateDelta;

  for (let i = 0; i < runtimeState.movingTransforms.length; i += 1) {
    const transform = runtimeState.movingTransforms[i];
    const baseX = runtimeState.movingBaseX[i];
    const phase = runtimeState.movingPhase[i];

    const offset = Math.sin(runtimeState.elapsedMs * MOVE_SPEED_RAD_PER_MS + phase) * MOVE_AMPLITUDE;
    transform.curr.pos.x = baseX + offset;
  }

}

function rebuildBenchmarkWorld(world: UserWorld, targetCount: number): void {
  destroySpawnedEntities(world);

  runtimeState.targetCount = targetCount;
  runtimeState.spawnedEntityIds.length = 0;
  runtimeState.movingTransforms.length = 0;
  runtimeState.movingBaseX.length = 0;
  runtimeState.movingPhase.length = 0;

  const layout = resolveGridLayout(targetCount);
  runtimeState.layoutSummary = {
    viewportWidth: layout.viewportWidth,
    viewportHeight: layout.viewportHeight,
    safeWidth: layout.safeWidth,
    safeHeight: layout.safeHeight,
    minX: layout.startX,
    maxX: layout.startX + layout.safeWidth,
    minY: layout.startY,
    maxY: layout.startY + layout.safeHeight,
  };

  for (let i = 0; i < targetCount; i += 1) {
    const column = i % layout.columns;
    const row = Math.floor(i / layout.columns);

    const x = layout.startX + column * layout.stepX;
    const y = layout.startY + row * layout.stepY;

    const id = world.create();
    const transform = new Transform2D(x, y, 0);
    const sprite = new Sprite("iron-gear:small", 3, 3);

    sprite.layer = RENDER_LAYERS.world;
    sprite.zOrder = 0.3;

    world.add(id, transform);
    world.add(id, sprite);

    runtimeState.spawnedEntityIds.push(id);

    if (i % Math.round(1 / MOVE_RATIO) === 0) {
      runtimeState.movingTransforms.push(transform);
      runtimeState.movingBaseX.push(x);
      runtimeState.movingPhase.push((i % 1024) * 0.01);
    }
  }

  ensurePlayerIfMissing(world);
}

function destroySpawnedEntities(world: UserWorld): void {
  for (const id of runtimeState.spawnedEntityIds) {
    world.destroy(id);
  }

  runtimeState.spawnedEntityIds.length = 0;
  runtimeState.movingTransforms.length = 0;
  runtimeState.movingBaseX.length = 0;
  runtimeState.movingPhase.length = 0;
}

function ensurePlayerIfMissing(world: UserWorld): void {
  const [playerId] = world.query(PlayerComponent);
  if (playerId !== undefined) {
    return;
  }

  setupContextPlayer(world, 0, 0);
}

function sanitizeTargetCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TARGET_COUNT;
  }

  const integerValue = Math.trunc(value);
  if (integerValue < 1) {
    return DEFAULT_TARGET_COUNT;
  }

  return integerValue;
}

function resolveGridLayout(targetCount: number): {
  viewportWidth: number;
  viewportHeight: number;
  safeWidth: number;
  safeHeight: number;
  columns: number;
  startX: number;
  startY: number;
  stepX: number;
  stepY: number;
} {
  const fallbackWidth = 1920;
  const fallbackHeight = 1080;
  const viewportWidth = typeof window === "undefined" ? fallbackWidth : Math.max(320, window.innerWidth);
  const viewportHeight = typeof window === "undefined" ? fallbackHeight : Math.max(180, window.innerHeight);

  const safeWidth = Math.max(50, viewportWidth * 0.9);
  const safeHeight = Math.max(50, viewportHeight * 0.9);
  const aspectRatio = safeWidth / safeHeight;

  const columns = Math.max(1, Math.ceil(Math.sqrt(targetCount * aspectRatio)));
  const rows = Math.max(1, Math.ceil(targetCount / columns));

  const stepX = columns === 1 ? 0 : safeWidth / (columns - 1);
  const stepY = rows === 1 ? 0 : safeHeight / (rows - 1);

  return {
    viewportWidth,
    viewportHeight,
    safeWidth,
    safeHeight,
    columns,
    startX: -safeWidth * 0.5,
    startY: -safeHeight * 0.5,
    stepX,
    stepY,
  };
}

function clampSampleDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) {
    return DEFAULT_SAMPLE_DURATION_MS;
  }

  const value = Math.trunc(durationMs);
  if (value < MIN_SAMPLE_DURATION_MS) {
    return MIN_SAMPLE_DURATION_MS;
  }

  if (value > MAX_SAMPLE_DURATION_MS) {
    return MAX_SAMPLE_DURATION_MS;
  }

  return value;
}

function scheduleSampleFrame(): void {
  const sample = runtimeState.sample;
  if (!sample.active) {
    return;
  }

  sample.rafHandle = window.requestAnimationFrame(sampleFrame);
}

function sampleFrame(nowMs: number): void {
  const sample = runtimeState.sample;
  if (!sample.active) {
    return;
  }

  const lastFrameAtMs = sample.rafLastAtMs;
  if (lastFrameAtMs !== null) {
    sample.frameDurationsMs.push(nowMs - lastFrameAtMs);
  }

  sample.rafLastAtMs = nowMs;

  if (nowMs >= sample.endTimeMs) {
    finalizeSample(nowMs);
    return;
  }

  scheduleSampleFrame();
}

function finalizeSample(nowMs: number): void {
  const sample = runtimeState.sample;

  if (sample.timeoutHandle !== null) {
    window.clearTimeout(sample.timeoutHandle);
    sample.timeoutHandle = null;
  }

  if (sample.rafHandle !== null) {
    window.cancelAnimationFrame(sample.rafHandle);
    sample.rafHandle = null;
  }

  sample.active = false;
  sample.endTimeMs = 0;
  sample.rafLastAtMs = null;

  const durations = sample.frameDurationsMs;
  if (durations.length === 0) {
    sample.lastResult = {
      durationMs: 0,
      frames: 0,
      fpsAvg: 0,
      frameTimeAvgMs: 0,
      frameTimeP95Ms: 0,
      frameTimeP99Ms: 0,
      frameTimeMinMs: 0,
      frameTimeMaxMs: 0,
    };

    durations.length = 0;
    return;
  }

  const sortedDurations = [...durations].sort((left, right) => left - right);
  const frameCount = durations.length;
  const durationMs = durations.reduce((sum, value) => sum + value, 0);
  const frameTimeAvgMs = durationMs / frameCount;
  const fpsAvg = frameTimeAvgMs > 0 ? 1000 / frameTimeAvgMs : 0;

  sample.lastResult = {
    durationMs,
    frames: frameCount,
    fpsAvg,
    frameTimeAvgMs,
    frameTimeP95Ms: percentile(sortedDurations, 0.95),
    frameTimeP99Ms: percentile(sortedDurations, 0.99),
    frameTimeMinMs: sortedDurations[0] ?? 0,
    frameTimeMaxMs: sortedDurations[sortedDurations.length - 1] ?? 0,
  };

  durations.length = 0;

  const result = sample.lastResult;
  console.info(
    "[BenchmarkScene] sample",
    {
      targetCount: runtimeState.targetCount,
      fpsAvg: result.fpsAvg.toFixed(2),
      frameTimeAvgMs: result.frameTimeAvgMs.toFixed(2),
      frameTimeP95Ms: result.frameTimeP95Ms.toFixed(2),
      frameTimeP99Ms: result.frameTimeP99Ms.toFixed(2),
      frames: result.frames,
      capturedDurationMs: result.durationMs.toFixed(0),
      sampledAtMs: nowMs.toFixed(0),
    },
  );
}

function percentile(sortedValues: number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor((sortedValues.length - 1) * ratio)),
  );

  return sortedValues[index] ?? 0;
}
