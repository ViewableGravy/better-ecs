import { createInitializationSystem } from "@engine";
import { Engine, fromContext } from "@engine/context";

export const Initialization = createInitializationSystem(() => {
  const engine = fromContext(Engine);
  const togglePause = (event: KeyboardEvent): void => {
    if (event.repeat || event.code !== "Space" || !event.ctrlKey || !event.shiftKey) {
      return;
    }

    event.preventDefault();
    engine.editor.runningState.toggle();
  };

  window.addEventListener("keydown", togglePause);
  return () => window.removeEventListener("keydown", togglePause);
});
