import type { AssetManager } from "../asset/AssetManager";
import { Canvas2DHighLevel } from "./canvas2d-high-level";
import { Canvas2DLowLevel } from "./canvas2d-low-level";
import type { HighLevelRenderer } from "./high-level";
import type { LowLevelRenderer } from "./low-level";
import { DEFAULT_RENDERER_CONFIG, type Renderer, type RendererConfig } from "./renderer";
import { TextureCache } from "./texture-cache";

/**
 * Canvas 2D composite renderer.
 *
 * Wires together:
 *   - `Canvas2DLowLevel`   — raw CanvasRenderingContext2D draw calls
 *   - `Canvas2DHighLevel`  — game-object → draw-data translation
 *   - `TextureCache`       — texture lifecycle management
 *
 * Usage:
 * ```ts
 * const renderer = new Canvas2DRenderer();
 * renderer.initialize(canvas, assets);
 *
 * // In render loop:
 * renderer.high.begin();
 * renderer.high.clear(clearColor);
 * renderer.high.set(camera, cameraTransform, alpha);
 * renderer.high.render(sprite, transform, alpha);
 * renderer.high.end();
 * ```
 */
export class Canvas2DRenderer implements Renderer {
  public readonly config: RendererConfig;

  public readonly low: LowLevelRenderer;
  public readonly high: HighLevelRenderer;

  private readonly textureCache: TextureCache;

  constructor(config?: Partial<RendererConfig>) {
    this.config = { ...DEFAULT_RENDERER_CONFIG, ...config };

    this.textureCache = new TextureCache({
      textureUploadBudget: this.config.textureUploadBudget,
      warnOnLazyLoad: this.config.warnOnLazyLoad,
    });

    const lowLevel = new Canvas2DLowLevel();
    this.low = lowLevel;

    this.high = new Canvas2DHighLevel(lowLevel, this.textureCache, {
      showFallback: this.config.showFallback,
    });
  }

  initialize(canvas: HTMLCanvasElement, assets: AssetManager): void {
    this.low.initialize(canvas);
    this.textureCache.initialize(assets);
  }
}
