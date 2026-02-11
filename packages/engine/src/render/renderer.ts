import type { AssetManager } from "../asset/AssetManager";
import type { HighLevelRendererConfig } from "./canvas2d-high-level";
import type { HighLevelRenderer } from "./high-level";
import type { LowLevelRenderer } from "./low-level";
import type { TextureCacheConfig } from "./texture-cache";

export type { Renderable, Settable } from "./high-level";
export type { ShapeRenderData, SpriteRenderData } from "./low-level";
export { type TextureCacheConfig } from "./texture-cache";
export type { TextureHandle, TextureInfo, TextureState, TextureStatus } from "./texture-cache";

/**
 * Configuration for renderer behavior — combines cache and high-level
 * config into a single flat options object.
 */
export interface RendererConfig extends TextureCacheConfig, HighLevelRendererConfig {}

const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  textureUploadBudget: 4,
  showFallback: true,
  warnOnLazyLoad: typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true,
};

export { DEFAULT_RENDERER_CONFIG };

/**
 * Composite renderer — the entry point for all rendering.
 *
 * Provides two layers:
 *   - `low`  — raw draw primitives (sprites, shapes, camera, viewport)
 *   - `high` — game-object level API (render, set, cache, begin/end/clear)
 *
 * Most game systems should use `high` exclusively.
 * `low` is available for custom / advanced rendering.
 */
export interface Renderer {
  /** Initialize the renderer with a canvas and asset manager. */
  initialize(canvas: HTMLCanvasElement, assets: AssetManager): void;

  /** Low-level draw primitives. */
  readonly low: LowLevelRenderer;

  /** High-level game-object rendering API. */
  readonly high: HighLevelRenderer;

  /** The active configuration. */
  readonly config: RendererConfig;
}
