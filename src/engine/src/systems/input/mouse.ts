import { getContextEngine } from "@engine/core/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type MousePoint = Readonly<{
  x: number;
  y: number;
}>;

export type MouseCameraView = {
  x: number;
  y: number;
  zoom: number;
};

export type Mouse = {
  readonly screen: MousePoint;
  readonly canvas: MousePoint;
  world(camera: MouseCameraView): MousePoint;
  world(x: number, y: number, zoom: number): MousePoint;
};

type MutablePoint = {
  x: number;
  y: number;
};

const screenPointer: MutablePoint = {
  x: 0,
  y: 0,
};

const canvasPointer: MutablePoint = {
  x: 0,
  y: 0,
};

const worldPointer: MutablePoint = {
  x: 0,
  y: 0,
};

const canvasViewport = {
  width: 0,
  height: 0,
};

let lastScreenUpdateTime = -1;
let lastCanvasUpdateTime = -1;
let lastScreenClientX = Number.NaN;
let lastScreenClientY = Number.NaN;
let lastCanvasClientX = Number.NaN;
let lastCanvasClientY = Number.NaN;

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
export const mouseApi: Mouse = {
  get screen(): MousePoint {
    const engine = getContextEngine();
    const currentTime = engine.meta.lastUpdateTime;
    const { data } = engine.systems["engine:input"];
    
    if (
      lastScreenUpdateTime !== currentTime
      || lastScreenClientX !== data.mouseClientX
      || lastScreenClientY !== data.mouseClientY
    ) {
      screenPointer.x = data.mouseClientX;
      screenPointer.y = data.mouseClientY;
      lastScreenUpdateTime = currentTime;
      lastScreenClientX = data.mouseClientX;
      lastScreenClientY = data.mouseClientY;
    }
    
    return screenPointer;
  },
  get canvas(): MousePoint {
    const engine = getContextEngine();
    const currentTime = engine.meta.lastUpdateTime;
    const { data } = engine.systems["engine:input"];
    
    if (
      lastCanvasUpdateTime !== currentTime
      || lastCanvasClientX !== data.mouseClientX
      || lastCanvasClientY !== data.mouseClientY
    ) {
      updateCanvasPointer(
        engine.canvas, 
        data.mouseClientX, 
        data.mouseClientY
      );
      
      lastCanvasUpdateTime = currentTime;
      lastCanvasClientX = data.mouseClientX;
      lastCanvasClientY = data.mouseClientY;
    }

    return canvasPointer;
  },
  world(cameraOrX: MouseCameraView | number, y?: number, zoom?: number): MousePoint {
    const engine = getContextEngine();
    const currentTime = engine.meta.lastUpdateTime;
    const { data } = engine.systems["engine:input"];
    
    // Note: We can't memoize world pointer based on just time since camera parameters change
    // However, we can still avoid re-computing canvas pointer if it was already computed this frame
    if (
      lastCanvasUpdateTime !== currentTime
      || lastCanvasClientX !== data.mouseClientX
      || lastCanvasClientY !== data.mouseClientY
    ) {
      updateCanvasPointer(
        engine.canvas, 
        data.mouseClientX, 
        data.mouseClientY
      );
      
      lastCanvasUpdateTime = currentTime;
      lastCanvasClientX = data.mouseClientX;
      lastCanvasClientY = data.mouseClientY;
    }

    let cameraX: number;
    let cameraY: number;
    let cameraZoom: number;

    if (typeof cameraOrX === "number") {
      if (y === undefined || zoom === undefined) {
        throw new Error("mouse.world(x, y, zoom) requires all numeric arguments");
      }

      cameraX = cameraOrX;
      cameraY = y;
      cameraZoom = zoom;
    } else {
      cameraX = cameraOrX.x;
      cameraY = cameraOrX.y;
      cameraZoom = cameraOrX.zoom;
    }

    if (cameraZoom <= 0) {
      worldPointer.x = cameraX;
      worldPointer.y = cameraY;
      return worldPointer;
    }

    worldPointer.x = (canvasPointer.x - canvasViewport.width / 2) / cameraZoom + cameraX;
    worldPointer.y = (canvasPointer.y - canvasViewport.height / 2) / cameraZoom + cameraY;

    return worldPointer;
  },
};

function updateCanvasPointer(
  canvas: HTMLCanvasElement,
  mouseClientX: number,
  mouseClientY: number,
): void {
  screenPointer.x = mouseClientX;
  screenPointer.y = mouseClientY;

  const rect = canvas.getBoundingClientRect();
  canvasPointer.x = mouseClientX - rect.left;
  canvasPointer.y = mouseClientY - rect.top;
  canvasViewport.width = rect.width;
  canvasViewport.height = rect.height;
}
