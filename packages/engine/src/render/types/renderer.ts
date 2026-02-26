import type { LooseAssetManager } from "../../asset/AssetManager";
import type { Camera } from "../../components/camera";
import type { Shape } from "../../components/shape";
import type { Color, Sprite } from "../../components/sprite";
import type { Transform2D } from "../../components/transform/transform2d";
import type { TextureCache, TextureCacheConfig } from "../textureCache/texture-cache";
import type { ShapeRenderData } from "./low-level";

export { type TextureCacheConfig } from "../textureCache/texture-cache";
export type { TextureHandle, TextureInfo, TextureState, TextureStatus } from "../textureCache/texture-cache";
export type { ShapeRenderData, SpriteRenderData } from "./low-level";

export type Renderable = Sprite | Shape;
export type Settable = Camera;

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
  warnOnLazyLoad: typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true,
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
  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): void;

  begin(): void;
  end(): void;
  clear(color: Color): void;

  render(renderable: Renderable, transform: Transform2D, alpha: number): void;
  set(value: Settable, transform: Transform2D, alpha: number): void;

  drawShape(data: ShapeRenderData): void;

  setCamera(x: number, y: number, zoom: number): void;
  getCameraX(): number;
  getCameraY(): number;
  getCameraZoom(): number;

  getWidth(): number;
  getHeight(): number;

  readonly cache: TextureCache;
  readonly config: RendererConfig;
}
