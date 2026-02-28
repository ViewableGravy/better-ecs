import type { Color } from "@components/sprite";
import type { ShapeRenderData } from "@render/types/low-level";
import type { WebGLProgramRegistry } from "@render/renderers/webGL/registry";

export type Vec2 = { x: number; y: number };

export type ShapeType = ShapeRenderData["type"];

export interface ShapeDrawerContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  center: Vec2;
  cameraZoom: number;
  programs: WebGLProgramRegistry;
  drawColorTriangles(vertices: Float32Array, color: Color): void;
}

export interface ShapeDrawerRegistry {
  get(type: ShapeType): ShapeDrawer;
  draw(context: ShapeDrawerContext, data: ShapeRenderData): void;
}

export type ShapeDrawer = (
  context: ShapeDrawerContext,
  data: ShapeRenderData,
  registry: ShapeDrawerRegistry,
) => void;

export type ShapeDrawerMap = Record<ShapeType, ShapeDrawer>;
