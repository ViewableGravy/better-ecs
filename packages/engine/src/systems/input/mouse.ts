import { useEngine, useSystem } from "../../core/context";

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
let lastWorldUpdateTime = -1;

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
const mouseApi: Mouse = {
  get screen(): MousePoint {
    const engine = useEngine();
    const currentTime = engine.frame.lastUpdateTime;
    
    if (lastScreenUpdateTime !== currentTime) {
      const { data } = useSystem("engine:input");
      screenPointer.x = data.mouseClientX;
      screenPointer.y = data.mouseClientY;
      lastScreenUpdateTime = currentTime;
    }
    
    return screenPointer;
  },
  get canvas(): MousePoint {
    const engine = useEngine();
    const currentTime = engine.frame.lastUpdateTime;
    
    if (lastCanvasUpdateTime !== currentTime) {
      const { data } = useSystem("engine:input");

      updateCanvasPointer(
        engine.canvas, 
        data.mouseClientX, 
        data.mouseClientY
      );
      
      lastCanvasUpdateTime = currentTime;
    }

    return canvasPointer;
  },
  world(cameraOrX: MouseCameraView | number, y?: number, zoom?: number): MousePoint {
    const engine = useEngine();
    const currentTime = engine.frame.lastUpdateTime;
    
    // Note: We can't memoize world pointer based on just time since camera parameters change
    // However, we can still avoid re-computing canvas pointer if it was already computed this frame
    if (lastCanvasUpdateTime !== currentTime) {
      const { data } = useSystem("engine:input");
      
      updateCanvasPointer(
        engine.canvas, 
        data.mouseClientX, 
        data.mouseClientY
      );
      
      lastCanvasUpdateTime = currentTime;
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

export function useMouse(): Mouse {
  return mouseApi;
}

function updateCanvasPointer(
  canvas: HTMLCanvasElement | null,
  mouseClientX: number,
  mouseClientY: number,
): void {
  screenPointer.x = mouseClientX;
  screenPointer.y = mouseClientY;

  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    canvasPointer.x = mouseClientX - rect.left;
    canvasPointer.y = mouseClientY - rect.top;
    canvasViewport.width = rect.width;
    canvasViewport.height = rect.height;

    return;
  }

  canvasPointer.x = mouseClientX;
  canvasPointer.y = mouseClientY;

  if (typeof window === "undefined") {
    canvasViewport.width = 0;
    canvasViewport.height = 0;
    return;
  }

  canvasViewport.width = window.innerWidth;
  canvasViewport.height = window.innerHeight;
}
