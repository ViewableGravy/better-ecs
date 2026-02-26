import { DEFAULT_RENDERER_CONFIG, type RendererConfig } from "../../types/renderer";
import { Renderer2D } from "../renderer2d";
import { Canvas2DRenderAPI } from "./canvas2d-renderer-api";

/**
 * Canvas 2D convenience renderer.
 *
 * Wires together:
 *   - `Canvas2DRenderAPI` — backend renderer API
 *   - `RenderCommand`     — backend command facade
 *   - `Renderer2D`        — 2D orchestration layer
 *
 * Usage:
 * ```ts
 * const renderer = new Canvas2DRenderer();
 * renderer.initialize(canvas, assets);
 *
 * // In render loop:
 * renderer.begin();
 * renderer.clear(clearColor);
 * renderer.set(camera, cameraTransform, alpha);
 * renderer.render(sprite, transform, alpha);
 * renderer.end();
 * ```
 */
export class Canvas2DRenderer extends Renderer2D {
  constructor(config?: Partial<RendererConfig>) {
    super(new Canvas2DRenderAPI(), { ...DEFAULT_RENDERER_CONFIG, ...config });
  }
}
