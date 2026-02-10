import { Color } from "../components/sprite";
import type { Texture } from "../components/texture";

/**
 * Opaque handle for loaded textures.
 * The actual type depends on the renderer implementation.
 */
export type TextureHandle = number;

/**
 * Data required to render a sprite.
 */
export interface SpriteRenderData {
  texture: TextureHandle;
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
 * Data required to render a shape.
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
 * Minimal renderer interface.
 * Implementations can target Canvas2D, WebGL, WebGPU, etc.
 */
export interface Renderer {
  /** Initialize the renderer with a canvas element */
  initialize(canvas: HTMLCanvasElement): void;
  
  /** Begin a new frame */
  beginFrame(): void;
  
  /** End the current frame */
  endFrame(): void;
  
  /** Clear the screen with a color */
  clear(color: Color): void;
  
  /** Set the camera transform (position and zoom) */
  setCamera(x: number, y: number, zoom: number): void;
  
  /** Load a texture from an engine Texture object, returns a handle */
  loadTexture(texture: Texture): TextureHandle;
  
  /** Get a previously loaded texture handle by its source uid */
  getTextureHandle(sourceUid: number): TextureHandle | null;
  
  /** Delete a loaded texture */
  deleteTexture(handle: TextureHandle): void;
  
  /** Draw a sprite */
  drawSprite(data: SpriteRenderData): void;
  
  /** Draw a shape */
  drawShape(data: ShapeRenderData): void;
  
  /** Get canvas width */
  getWidth(): number;
  
  /** Get canvas height */
  getHeight(): number;
}
