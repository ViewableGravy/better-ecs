import type { Color } from "@components/sprite";
import type { ShapeRenderInput, ShapeType } from "@render/types/low-level";
import type { WebGLProgramRegistry } from "@render/renderers/webGL/registry";

export type Vec2 = { x: number; y: number };

export interface ShapeDrawerContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  center: Vec2;
  cameraZoom: number;
  programs: WebGLProgramRegistry;
  drawColorTriangles(vertices: Float32Array, color: Color): void;
  drawMeshLinesFromTriangles(vertices: Float32Array): void;
  drawMeshLinesFromTriangleStrip(vertices: Float32Array): void;
}

export interface ShapeDrawerRegistry {
  get(type: ShapeType): ShapeDrawer;
  draw(context: ShapeDrawerContext, data: ShapeRenderInput): void;
}

export type ShapeDrawer = (
  context: ShapeDrawerContext,
  data: ShapeRenderInput,
  registry: ShapeDrawerRegistry,
) => void;

export type ShapeDrawerMap = Record<ShapeType, ShapeDrawer>;
