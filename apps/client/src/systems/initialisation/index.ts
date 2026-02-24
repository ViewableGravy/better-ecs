import { invariantById } from "@/utilities/selectors";
import { createInitializationSystem, useEngine, useSetScene } from "@repo/engine";

export const System = createInitializationSystem(() => {
  const setScene = useSetScene();
  const engine = useEngine();
  const canvas = engine.canvas;

  const canvasContainer = canvas.parentElement;

  if (!canvasContainer) {
    throw new Error("Engine canvas must have a parent element for scene switcher mounting.");
  }

  if (window.getComputedStyle(canvasContainer).position === "static") {
    canvasContainer.style.position = "relative";
  }

  const sceneSwitcherRoot = invariantById("scene-switcher");

  // Setup simple scene switcher UI
  sceneSwitcherRoot.innerHTML = `
    <div style="position: absolute; top: 10px; left: 10px; z-index: 1000; display: flex; gap: 10px; flex-direction: column; align-items: flex-start;">
      <button id="to-main" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px; color: black;">Go to Main Scene</button>
      <button id="to-e2e" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px; color: black;">Go to E2E Scene</button>
    </div>
  `;

  canvasContainer.append(sceneSwitcherRoot);

  invariantById("to-e2e").onclick = () => {
    setScene("E2EScene");
  };

  invariantById("to-main").onclick = () => {
    setScene("MainScene");
  };
});
