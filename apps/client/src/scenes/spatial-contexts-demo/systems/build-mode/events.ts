import { useSystem } from "@repo/engine";
import { GRID_CODE } from "./const";

export function bindBuildModeDomEvents(canvas: HTMLCanvasElement): () => void {
  const { data } = useSystem("main:build-mode");

  const onPointerDown = (event: PointerEvent) => {
    if (event.button === 0) {
      data.pendingPlace = true;
    }

    if (event.button === 2) {
      data.pendingDelete = true;
      event.preventDefault();
    }
  };

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const hasModifier = event.ctrlKey || event.metaKey;
    if (!hasModifier) {
      return;
    }

    if (event.code === GRID_CODE) {
      event.preventDefault();
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("keydown", onKeyDown);
  };
}
