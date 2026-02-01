import { createSystem, useEngine, useWorld, EntityId } from "@repo/engine";
import { Camera, Shape, Transform2D, Color } from "@repo/engine/components";
import { Canvas2DRenderer, Renderer } from "@repo/engine/render";
import z from "zod";

// Module-level renderer instance (initialized once)
let renderer: Renderer | null = null;

/**
 * Unified render system that handles all rendering (shapes, sprites, etc.)
 * Renders entities with shapes and handles camera transforms.
 * Uses interpolation between physics updates for smooth animation.
 */
export const System = createSystem("render")({
  initialize: Initialize,
  system: RenderFrame,
  phase: "render",
  schema: {
    default: {},
    schema: z.object({}),
  },
});

/**
 * Lerp between previous and current value based on interpolation factor
 */
function lerp(prev: number, current: number, alpha: number): number {
  return prev + ((current - prev) * alpha);
}

function Initialize() {
  const canvas = document.getElementById("game")! as HTMLCanvasElement;
  
  // Initialize renderer
  renderer = new Canvas2DRenderer();
  renderer.initialize(canvas);
  
  // Handle canvas resize
  function resizeCanvas(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function useCamera(renderer: Renderer) {
  const world = useWorld();
  const engine = useEngine();

  // Calculate interpolation factor based on time since last update
  // This prevents teleporting by resetting to 0 after each update
  const updateTimeMs = 1000 / engine.frame.ups;
  const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
  const alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1.0);

  // Find and apply camera
  let cameraX = 0;
  let cameraY = 0;
  let cameraZoom = 1;
  
  for (const cameraId of world.query(Camera, Transform2D)) {
    const camera = world.get(cameraId, Camera);
    const transform = world.get(cameraId, Transform2D);
    
    if (camera && camera.enabled && transform) {
      // Interpolate camera position
      cameraX = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
      cameraY = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
      // Calculate zoom from orthoSize: smaller orthoSize = more zoom
      // We want orthoSize to represent half the visible height
      cameraZoom = renderer.getHeight() / (camera.orthoSize * 2);
      break; // Use first enabled camera
    }
  }

  renderer.setCamera(cameraX, cameraY, cameraZoom)
}

function RenderFrame() {
  if (!renderer) return;
  
  const engine = useEngine();
  const world = useWorld();
  
  // Calculate interpolation factor based on time since last update
  // This prevents teleporting by resetting to 0 after each update
  const updateTimeMs = 1000 / engine.frame.ups;
  const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
  const alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1.0);
  
  // Begin frame
  renderer.beginFrame();
  
  // Clear with dark background
  renderer.clear(new Color(0.1, 0.1, 0.15, 1));

  useCamera(renderer);
  
  // Collect and sort shapes by layer, then zOrder
  const shapeEntities: Array<{ id: EntityId; layer: number; zOrder: number }> = [];
  
  for (const entityId of world.query(Shape, Transform2D)) {
    const shape = world.get(entityId, Shape);
    if (shape) {
      shapeEntities.push({
        id: entityId,
        layer: shape.layer,
        zOrder: shape.zOrder,
      });
    }
  }
  
  // Sort by layer first, then zOrder
  shapeEntities.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    return a.zOrder - b.zOrder;
  });
  
  // Render shapes with interpolation
  for (const { id } of shapeEntities) {
    const shape = world.get(id, Shape);
    const transform = world.get(id, Transform2D);
    
    if (!shape || !transform) continue;
    
    // Interpolate position between previous and current
    const interpolatedX = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    const interpolatedY = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    
    renderer.drawShape({
      type: shape.type,
      x: interpolatedX,
      y: interpolatedY,
      width: shape.width,
      height: shape.height,
      rotation: transform.curr.rotation,
      scaleX: transform.curr.scale.x,
      scaleY: transform.curr.scale.y,
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
    });
  }
  
  // End frame
  renderer.endFrame();
}