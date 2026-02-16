import { useSystem } from "@repo/engine";
import { GRID_OR_COLLIDER_CODES } from "./const";

export function bindBuildModeDomEvents(canvas: HTMLCanvasElement): () => void {
  const { data } = useSystem("demo:build-mode");

  const updatePointer = (event: PointerEvent | MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    data.mouseScreenX = event.clientX - rect.left;
    data.mouseScreenY = event.clientY - rect.top;
  };

  const onPointerMove = (event: PointerEvent) => {
    updatePointer(event);
  };

  const onPointerDown = (event: PointerEvent) => {
    updatePointer(event);

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

    if (GRID_OR_COLLIDER_CODES.has(event.code)) {
      event.preventDefault();
    }
  };

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("keydown", onKeyDown);
  };
}
