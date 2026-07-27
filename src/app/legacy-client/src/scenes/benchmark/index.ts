import { setupContextCamera } from "@legacy/scenes/world/contexts/shared";
import {
  BENCHMARK_ENTITY_COUNTS,
  DEFAULT_BENCHMARK_ENTITY_COUNT,
  requireBenchmarkEntityCount,
} from "@legacy/scenes/benchmark/config";
import { BenchmarkController } from "@legacy/scenes/benchmark/controller";
import { mountBenchmarkControls } from "@legacy/scenes/benchmark/controls";
import type { BenchmarkHarness } from "@legacy/scenes/benchmark/types";
import { createScene, createSystem } from "@engine";
import { ActiveRegistry, Engine, FromEngine, fromContext } from "@engine/context";

declare global {
  interface Window {
    __BETTER_ECS_BENCH__?: BenchmarkHarness;
  }
}

let runBenchmarkMotion: () => void = () => undefined;
let unmountControls: () => void = () => undefined;
let disposeController: () => void = () => undefined;

const BenchmarkMotionSystem = createSystem("benchmark:motion")({
  system() {
    runBenchmarkMotion();
  },
});

export const Scene = createScene("BenchmarkScene")({
  systems: [BenchmarkMotionSystem],
  async setup() {
    const registry = fromContext(ActiveRegistry);
    const engine = fromContext(Engine);
    const assets = fromContext(FromEngine.Assets);
    const controller = new BenchmarkController(registry, engine);

    setupContextCamera(registry);
    unmountControls = mountBenchmarkControls(controller, engine);
    disposeController = () => controller.dispose();
    runBenchmarkMotion = () => controller.update(engine.meta.updateTick);

    window.__BETTER_ECS_BENCH__ = {
      targets: BENCHMARK_ENTITY_COUNTS,
      configure: (count) => controller.configure(count),
      run: (count, options) => controller.run(count, options),
      status: () => controller.status(),
      result: () => controller.result(),
    };

    await assets.loadSheet("iron-gear");
    await controller.configure(readInitialTarget());
  },
  teardown() {
    disposeController();
    disposeController = () => undefined;
    runBenchmarkMotion = () => undefined;
    unmountControls();
    unmountControls = () => undefined;
    delete window.__BETTER_ECS_BENCH__;
  },
});

function readInitialTarget() {
  const value = new URLSearchParams(window.location.search).get("benchmarkTarget");
  if (value === null) {
    return DEFAULT_BENCHMARK_ENTITY_COUNT;
  }

  return requireBenchmarkEntityCount(Number(value));
}
