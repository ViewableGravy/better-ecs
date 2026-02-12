import type { Color } from "../components/sprite";

/**
 * Data required to draw a sprite at the low level.
 */
export interface SpriteRenderData {
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  anchorX: number;
  anchorY: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  flipX: boolean;
  flipY: boolean;
  tint: Color;
}

/**
 * Data required to draw a shape at the low level.
 */
export interface ShapeRenderData {
  type: "rectangle" | "circle" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  fill: Color;
  stroke: Color | null;
  strokeWidth: number;
}

/**
 * Low-level renderer interface — thin wrapper over the graphics backend.
 *
 * Operates in screen-space coordinates with explicit camera transforms.
 * Implementations target a specific backend (Canvas2D, WebGL, WebGPU, …).
 *
 * The high-level renderer delegates to this after resolving game objects
 * into draw data.
 */
export interface LowLevelRenderer {
  /** Bind to a canvas element. Must be called before any draw calls. */
  initialize(canvas: HTMLCanvasElement): void;

  // ── Frame lifecycle ────────────────────────────────────────────

  /** Prepare for a new frame (reset transforms, etc.). */
  beginFrame(): void;

  /** Finalize the frame (flush batches, swap buffers, etc.). */
  endFrame(): void;

  /** Fill the entire canvas with a solid color. */
  clear(color: Color): void;

  // ── Camera / projection ────────────────────────────────────────

  /** Set the camera world-position and zoom for world→screen conversion. */
  setCamera(x: number, y: number, zoom: number): void;

  /** Current camera X in world units. */
  getCameraX(): number;

  /** Current camera Y in world units. */
  getCameraY(): number;

  /** Current camera zoom factor. */
  getCameraZoom(): number;

  // ── Draw primitives ────────────────────────────────────────────

  /** Draw a sprite from fully resolved render data. */
  drawSprite(data: SpriteRenderData): void;

  /** Draw a shape from fully resolved render data. */
  drawShape(data: ShapeRenderData): void;

  // ── Viewport ───────────────────────────────────────────────────

  /** Canvas width in pixels. */
  getWidth(): number;

  /** Canvas height in pixels. */
  getHeight(): number;
}
