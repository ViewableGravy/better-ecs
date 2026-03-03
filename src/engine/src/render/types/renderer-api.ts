import type { LooseAssetManager } from "@engine/asset/AssetManager";
import type { Color } from "@engine/components/sprite/sprite";
import type { ShapeRenderInput, SpriteRenderData, TexturedQuadRenderData } from "@engine/render/types/low-level";

export interface RendererAPI {
  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void> | void;

  beginFrame(): void;
  endFrame(): void;
  clear(color: Color): void;

  setCamera(x: number, y: number, zoom: number): void;
  setMeshOverlayEnabled(enabled: boolean): void;
  getCameraX(): number;
  getCameraY(): number;
  getCameraZoom(): number;

  drawSprite(data: SpriteRenderData): void;
  drawTexturedQuad(data: TexturedQuadRenderData): void;
  drawShape(data: ShapeRenderInput): void;

  getWidth(): number;
  getHeight(): number;
}
