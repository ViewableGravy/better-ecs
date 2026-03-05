import { invariantById } from "@client/utilities/selectors";
import { createInitializationSystem } from "@engine";
import { Engine, fromContext, SetScene } from "@engine/context";

const BENCHMARK_TARGET_COUNTS = [10_000, 50_000, 100_000, 200_000, 500_000] as const;

export const System = createInitializationSystem(() => {
  const setScene = fromContext(SetScene);
  const engine = fromContext(Engine);
  const canvas = engine.canvas;

  const canvasContainer = canvas.parentElement;

  if (!canvasContainer) {
    throw new Error("Engine canvas must have a parent element for scene switcher mounting.");
  }

  if (window.getComputedStyle(canvasContainer).position === "static") {
    canvasContainer.style.position = "relative";
  }

  const sceneSwitcherRoot = invariantById("scene-switcher");

  const pauseToggleKeydownHandler = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.code !== "Space" || !event.ctrlKey || !event.shiftKey) {
      return;
    }

    event.preventDefault();
    engine.editor.runningState.toggle();
  };

  window.addEventListener("keydown", pauseToggleKeydownHandler);

  // Setup simple scene switcher UI
  sceneSwitcherRoot.innerHTML = `
    <div style="position: absolute; top: 10px; left: 10px; z-index: 1000; display: flex; gap: 10px; flex-direction: column; align-items: flex-start;">
      <button id="to-main" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px; color: black;">Go to Main Scene</button>
      <button id="to-e2e" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px; color: black;">Go to E2E Scene</button>
      <button id="to-benchmark" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px; color: black;">Go to Benchmark Scene</button>
      <div style="display: flex; gap: 6px; flex-wrap: wrap; max-width: 360px;">
        ${BENCHMARK_TARGET_COUNTS.map((count) => `<button class="benchmark-target" data-count="${count}" style="padding: 3px 6px; font-size: 12px; background: #f3f3f3; border-radius: 4px; color: black;">${Math.round(count / 1000)}k</button>`).join("")}
      </div>
    </div>
  `;

  canvasContainer.append(sceneSwitcherRoot);

  invariantById("to-e2e").onclick = () => {
    setScene("E2EScene");
  };

  invariantById("to-main").onclick = () => {
    setScene("MainScene");
  };

  invariantById("to-benchmark").onclick = () => {
    setScene("BenchmarkScene");
  };

  const benchmarkButtons = sceneSwitcherRoot.querySelectorAll<HTMLButtonElement>(".benchmark-target");
  for (const button of benchmarkButtons) {
    button.onclick = () => {
      const countText = button.dataset.count;
      if (!countText) {
        return;
      }

      const count = Number.parseInt(countText, 10);
      if (!Number.isFinite(count)) {
        return;
      }

      window.__BETTER_ECS_BENCH_TARGET_COUNT__ = count;
      const harness = window.__BETTER_ECS_BENCH__;
      if (harness) {
        harness.setTargetCount(count);
        return;
      }

      setScene("BenchmarkScene");
    };
  }

  return () => {
    window.removeEventListener("keydown", pauseToggleKeydownHandler);
  };
});
