import type { Color } from "../../components/sprite";
import type { ShapeRenderData, SpriteRenderData } from "./low-level";

export interface RendererAPI {
  initialize(canvas: HTMLCanvasElement): void;

  beginFrame(): void;
  endFrame(): void;
  clear(color: Color): void;

  setCamera(x: number, y: number, zoom: number): void;
  getCameraX(): number;
  getCameraY(): number;
  getCameraZoom(): number;

  drawSprite(data: SpriteRenderData): void;
  drawShape(data: ShapeRenderData): void;

  getWidth(): number;
  getHeight(): number;
}
