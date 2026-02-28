import type { ShaderSourceAsset } from "@assets";
import type { Color } from "@components/sprite/sprite";

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
export type ShapeType = "rectangle" | "circle" | "line" | "rounded-rectangle";

export interface ShapeRenderDataBase {
  type: ShapeType;
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

export interface RectangleShapeRenderData extends ShapeRenderDataBase {
  type: "rectangle";
  fillEnabled?: boolean;
}

export interface CircleShapeRenderData extends ShapeRenderDataBase {
  type: "circle";
  fillEnabled?: boolean;
  arcEnabled?: boolean;
  arcStart?: number;
  arcEnd?: number;
}

export interface LineShapeRenderData extends ShapeRenderDataBase {
  type: "line";
}

export interface RoundedRectangleShapeRenderData extends ShapeRenderDataBase {
  type: "rounded-rectangle";
  fillEnabled?: boolean;
  cornerRadius?: number;
}

export type ShapeRenderData =
  | RectangleShapeRenderData
  | CircleShapeRenderData
  | LineShapeRenderData
  | RoundedRectangleShapeRenderData;

/**
 * Dense shape command shape used by pooled/frame-allocator objects.
 *
 * This keeps one stable in-memory layout while allowing user-facing
 * discriminated unions to expose only relevant fields per shape kind.
 */
export interface DenseShapeRenderData extends ShapeRenderDataBase {
  type: "rectangle" | "circle" | "line" | "rounded-rectangle";
  fillEnabled: boolean;
  arcEnabled: boolean;
  arcStart: number;
  arcEnd: number;
  cornerRadius: number;
}

export type ShapeRenderInput = ShapeRenderData | DenseShapeRenderData;
