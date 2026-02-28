import type { ShaderSourceAsset } from "../../asset";
import type { Color } from "../../components/sprite";

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
 * Data required to draw a textured quad with a custom shader.
 */
export interface TexturedQuadRenderData {
  shader: ShaderSourceAsset;
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement | null;
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
  time: number;
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
