import { createInitializationSystem, useSetScene } from "@repo/engine";

export const System = createInitializationSystem(() => {
  const setScene = useSetScene();

  // Setup simple scene switcher UI
  document.getElementById("scene-switcher")!.innerHTML = `
    <div style="position: fixed; top: 10px; left: 10px; z-index: 1000; display: flex; gap: 10px; flex-direction: column; align-items: flex-start;">
      <button id="to-movement" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px;">Go to Test Scene</button>
      <button id="to-rendering" style="padding: 4px 8px; font-size: 14px; background: white; border-radius: 5px;">Go to Rendering Demo</button>
    </div>
  `;

  document.getElementById("to-movement")!.onclick = () => {
    setScene("TestScene");
  };

  document.getElementById("to-rendering")!.onclick = () => {
    setScene("RenderingDemo");
  };
})
