/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type AttachCanvasOptions = {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

export type AttachedCanvas = {
  canvas: HTMLCanvasElement;
  dispose: () => void;
};

export type CanvasResizeRegistration = {
  syncCanvasSize: () => void;
  dispose: () => void;
};

const CANVAS_BACKGROUND = "#1a1d24";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function registerCanvasResize(
  canvas: HTMLCanvasElement,
  root: HTMLElement,
): CanvasResizeRegistration {
  const syncCanvasSize = (): void => {
    const width = Math.max(1, Math.floor(root.clientWidth));
    const height = Math.max(1, Math.floor(root.clientHeight));
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
  };

  const resizeObserver = new ResizeObserver(() => {
    syncCanvasSize();
  });

  resizeObserver.observe(root);
  syncCanvasSize();

  return {
    syncCanvasSize,
    dispose: () => {
      resizeObserver.disconnect();
    },
  };
}

export function attachCanvas(root: HTMLElement, { onCanvasReady }: AttachCanvasOptions = {}): AttachedCanvas {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.background = CANVAS_BACKGROUND;

  root.append(canvas);
  const resizeRegistration = registerCanvasResize(canvas, root);
  onCanvasReady?.(canvas);

  return {
    canvas,
    dispose: () => {
      resizeRegistration.dispose();
      canvas.remove();
    }
  };
}
