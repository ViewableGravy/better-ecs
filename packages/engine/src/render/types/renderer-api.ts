import type { LooseAssetManager } from "../../asset/AssetManager";
import type { Color } from "../../components/sprite";
import type { ShapeRenderData, SpriteRenderData, TexturedQuadRenderData } from "./low-level";

export interface RendererAPI {
  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void> | void;

  beginFrame(): void;
  endFrame(): void;
  clear(color: Color): void;

  setCamera(x: number, y: number, zoom: number): void;
  getCameraX(): number;
  getCameraY(): number;
  getCameraZoom(): number;

  drawSprite(data: SpriteRenderData): void;
  drawTexturedQuad(data: TexturedQuadRenderData): void;
  drawShape(data: ShapeRenderData): void;

  getWidth(): number;
  getHeight(): number;
}
