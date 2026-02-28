import type { ShaderSourceAsset } from "@assets";
import type { LooseAssetManager } from "@assets/AssetManager";
import type { Camera } from "@components/camera";
import type { Shape } from "@components/shape";
import type { Color, Sprite } from "@components/sprite";
import type { Texture } from "@components/texture";
import type { ShaderTransform2D, Transform2D } from "@components/transform";
import type { TextureCache, TextureCacheConfig } from "@render/textureCache/texture-cache";
import type { ShapeRenderData } from "@render/types/low-level";

export { type TextureCacheConfig } from "@render/textureCache/texture-cache";
export type { TextureHandle, TextureInfo, TextureState, TextureStatus } from "@render/textureCache/texture-cache";
export type { ShapeRenderData, SpriteRenderData, TexturedQuadRenderData } from "@render/types/low-level";

export type Renderable = Sprite | Shape;
export type Settable = Camera;

export interface ShaderQuadOptions {
  texture?: Texture;
  tint?: Color;
  time?: number;
}

export interface TexturedQuadDrawData {
  shader: ShaderSourceAsset;
  texture?: Texture;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  anchorX: number;
  anchorY: number;
  tint?: Color;
  time: number;
}

/**
 * Configuration for renderer behavior — combines cache and 2D renderer
 * config into a single flat options object.
 */
export type RendererConfig = TextureCacheConfig & {
  showFallback: boolean;
};

const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  textureUploadBudget: 4,
  showFallback: true,
  warnOnLazyLoad: true,
};

export { DEFAULT_RENDERER_CONFIG };

/**
 * Renderer2D-facing composite renderer — the entry point for all rendering.
 *
 * Layering:
 *   - `RendererAPI`   — backend implementation (Canvas2D/WebGL)
 *   - `RenderCommand` — thin command facade over RendererAPI
 *   - `Renderer`      — 2D orchestration (camera, texture cache, renderables)
 */
export interface Renderer {
  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void>;

  begin(): void;
  end(): void;
  clear(color: Color): void;

  render(renderable: Renderable, transform: Transform2D, alpha: number): void;
  set(value: Settable, transform: Transform2D, alpha: number): void;

  drawShape(data: ShapeRenderData): void;
  drawTexturedQuad(data: TexturedQuadDrawData): void;
  drawShaderQuad(shader: ShaderSourceAsset, transform: ShaderTransform2D, options?: ShaderQuadOptions): void;

  setCamera(x: number, y: number, zoom: number): void;
  getCameraX(): number;
  getCameraY(): number;
  getCameraZoom(): number;

  getWidth(): number;
  getHeight(): number;

  readonly cache: TextureCache;
  readonly config: RendererConfig;
}
