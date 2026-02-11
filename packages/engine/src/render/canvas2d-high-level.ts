import { Camera } from "../components/camera";
import { Shape } from "../components/shape";
import { Color, Sprite } from "../components/sprite";
import type { Transform2D } from "../components/transform/transform2d";
import type { HighLevelRenderer, Renderable, Settable } from "./high-level";
import type { LowLevelRenderer, ShapeRenderData, SpriteRenderData } from "./low-level";
import type { TextureCache, TextureState } from "./texture-cache";

// ── Shared render data (avoids per-frame allocation) ─────────────

const SHARED_SPRITE_DATA: SpriteRenderData = {
  // placeholder — filled before each draw
  image: null as unknown as HTMLImageElement,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  anchorX: 0.5,
  anchorY: 0.5,
  sourceX: 0,
  sourceY: 0,
  sourceWidth: 0,
  sourceHeight: 0,
  flipX: false,
  flipY: false,
  tint: new Color(),
};

const SHARED_SHAPE_DATA: ShapeRenderData = {
  type: "rectangle",
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  fill: new Color(),
  stroke: null,
  strokeWidth: 0,
};

// Fallback colors
const FALLBACK_PENDING_COLOR = new Color(1, 0, 1, 0.4); // semi-transparent magenta
const FALLBACK_ERROR_COLOR = new Color(1, 0, 0, 0.6); // semi-transparent red

/**
 * Configuration for high-level rendering behavior.
 */
export interface HighLevelRendererConfig {
  /**
   * Whether to render a fallback placeholder for sprites whose
   * textures are still loading. Default: true.
   */
  showFallback: boolean;
}

/**
 * Canvas 2D implementation of the high-level renderer.
 *
 * Translates game-object rendering calls into low-level draw data,
 * handles texture resolution via the TextureCache, and renders
 * fallback placeholders for pending/errored assets.
 */
export class Canvas2DHighLevel implements HighLevelRenderer {
  private low: LowLevelRenderer;

  public readonly cache: TextureCache;

  private showFallback: boolean;

  constructor(
    low: LowLevelRenderer,
    cache: TextureCache,
    config?: Partial<HighLevelRendererConfig>,
  ) {
    this.low = low;
    this.cache = cache;
    this.showFallback = config?.showFallback ?? true;
  }

  // ── Frame lifecycle ──────────────────────────────────────────────

  begin(): void {
    this.cache.resetFrameBudget();
    this.low.beginFrame();
  }

  end(): void {
    this.low.endFrame();
  }

  clear(color: Color): void {
    this.low.clear(color);
  }

  // ── Rendering ────────────────────────────────────────────────────

  render(renderable: Renderable, transform: Transform2D, alpha: number): void {
    if (renderable instanceof Sprite) {
      this.renderSprite(renderable, transform, alpha);
      return;
    }

    if (renderable instanceof Shape) {
      this.renderShape(renderable, transform, alpha);
      return;
    }
  }

  // ── State configuration ──────────────────────────────────────────

  set(value: Settable, transform: Transform2D, alpha: number): void {
    if (value instanceof Camera) {
      const x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
      const y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
      const zoom = this.low.getHeight() / (value.orthoSize * 2);
      this.low.setCamera(x, y, zoom);
      return;
    }
  }

  // ── Viewport ─────────────────────────────────────────────────────

  getWidth(): number {
    return this.low.getWidth();
  }

  getHeight(): number {
    return this.low.getHeight();
  }

  // ── Private: sprite rendering ────────────────────────────────────

  private renderSprite(sprite: Sprite, transform: Transform2D, alpha: number): void {
    const tex = this.cache.get(sprite.assetId);

    if (!tex) {
      if (this.showFallback) {
        const status = this.cache.getStatus(sprite.assetId);
        this.drawFallback(sprite, transform, alpha, status.state);
      }
      return;
    }

    const image = this.cache.getImage(tex.handle);
    if (!image) return;

    const d = SHARED_SPRITE_DATA;
    d.image = image;
    d.x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    d.y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    d.width = sprite.width || tex.width;
    d.height = sprite.height || tex.height;
    d.rotation = transform.curr.rotation;
    d.scaleX = transform.curr.scale.x;
    d.scaleY = transform.curr.scale.y;
    d.anchorX = sprite.anchorX;
    d.anchorY = sprite.anchorY;
    d.sourceX = tex.frameX;
    d.sourceY = tex.frameY;
    d.sourceWidth = tex.frameWidth;
    d.sourceHeight = tex.frameHeight;
    d.flipX = sprite.flipX;
    d.flipY = sprite.flipY;
    d.tint = sprite.tint;

    this.low.drawSprite(d);
  }

  // ── Private: shape rendering ─────────────────────────────────────

  private renderShape(shape: Shape, transform: Transform2D, alpha: number): void {
    const d = SHARED_SHAPE_DATA;
    d.type = shape.type;
    d.x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    d.y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    d.width = shape.width;
    d.height = shape.height;
    d.rotation = transform.curr.rotation;
    d.scaleX = transform.curr.scale.x;
    d.scaleY = transform.curr.scale.y;
    d.fill = shape.fill;
    d.stroke = shape.stroke;
    d.strokeWidth = shape.strokeWidth;

    this.low.drawShape(d);
  }

  // ── Private: fallback placeholder ────────────────────────────────

  private drawFallback(
    sprite: Sprite,
    transform: Transform2D,
    alpha: number,
    state: TextureState,
  ): void {
    const x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    const y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    const w = sprite.width || 32;
    const h = sprite.height || 32;

    const color = state === "error" ? FALLBACK_ERROR_COLOR : FALLBACK_PENDING_COLOR;

    const fallbackShape: ShapeRenderData = {
      type: "rectangle",
      x,
      y,
      width: w,
      height: h,
      rotation: transform.curr.rotation,
      scaleX: transform.curr.scale.x,
      scaleY: transform.curr.scale.y,
      fill: state === "error" ? color : new Color(color.r, color.g, color.b, 0.15),
      stroke: color,
      strokeWidth: 2,
    };

    this.low.drawShape(fallbackShape);
  }
}

// ── Utility ──────────────────────────────────────────────────────────

function lerp(prev: number, current: number, alpha: number): number {
  return prev + (current - prev) * alpha;
}
