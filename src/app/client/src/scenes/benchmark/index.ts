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
};

type BenchmarkRuntimeState = {
  world: UserWorld | null;
  elapsedMs: number;
  targetCount: number;
  spawnedEntityIds: EntityId[];
  movingTransforms: Transform2D[];
  movingBaseX: number[];
  movingPhase: number[];
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
const GRID_CELL_SIZE = 14;
const MOVE_AMPLITUDE = 5;
const MOVE_SPEED_RAD_PER_MS = 0.0035;
const MOVE_RATIO = 0.5;

const runtimeState: BenchmarkRuntimeState = {
  world: null,
  elapsedMs: 0,
  targetCount: DEFAULT_TARGET_COUNT,
  spawnedEntityIds: [],
  movingTransforms: [],
  movingBaseX: [],
  movingPhase: [],
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

  const columns = Math.max(1, Math.ceil(Math.sqrt(targetCount)));
  const halfWidth = (columns * GRID_CELL_SIZE) * 0.5;

  for (let i = 0; i < targetCount; i += 1) {
    const column = i % columns;
    const row = Math.floor(i / columns);

    const x = column * GRID_CELL_SIZE - halfWidth;
    const y = row * GRID_CELL_SIZE - 200;

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
