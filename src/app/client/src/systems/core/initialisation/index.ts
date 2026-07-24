import { invariantById } from "@client/utilities/selectors";
import { createInitializationSystem } from "@engine";
import { Engine, fromContext, SetScene } from "@engine/context";

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
      <button id="to-benchmark" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px; color: black;">Go to Stress Profiler</button>
      <button id="to-belt-stress" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px; color: black;">Go to Worker Belt Demo</button>
    </div>
  `;

  canvasContainer.append(sceneSwitcherRoot);

  const mainButton = invariantById<HTMLButtonElement>("to-main");
  const e2eButton = invariantById<HTMLButtonElement>("to-e2e");
  const benchmarkButton = invariantById<HTMLButtonElement>("to-benchmark");
  const beltStressButton = invariantById<HTMLButtonElement>("to-belt-stress");
  const syncTransitionState = (isTransitioning: boolean): void => {
    mainButton.disabled = isTransitioning;
    e2eButton.disabled = isTransitioning;
    benchmarkButton.disabled = isTransitioning;
    beltStressButton.disabled = isTransitioning;
  };
  const unsubscribeTransitionState = engine.scene.onTransitionStateChange(syncTransitionState);

  syncTransitionState(engine.scene.isTransitioning);

  e2eButton.onclick = () => {
    setScene("E2EScene");
  };

  mainButton.onclick = () => {
    setScene("MainScene");
  };

  benchmarkButton.onclick = () => {
    setScene("BenchmarkScene");
  };

  beltStressButton.onclick = () => {
    setScene("BeltStressScene");
  };

  return () => {
    unsubscribeTransitionState();
    window.removeEventListener("keydown", pauseToggleKeydownHandler);
  };
});
