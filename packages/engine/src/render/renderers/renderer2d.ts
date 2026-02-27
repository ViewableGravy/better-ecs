import type { LooseAssetManager } from "../../asset/AssetManager";
import { Camera } from "../../components/camera";
import { Shape } from "../../components/shape";
import { Color, Sprite } from "../../components/sprite";
import type { Transform2D } from "../../components/transform/transform2d";
import { RenderCommand } from "../render-command";
import { TextureCache } from "../textureCache/texture-cache";
import type {
  Renderable,
  Renderer,
  RendererConfig,
  Settable,
  ShapeRenderData,
  SpriteRenderData,
} from "../types/renderer";
import type { RendererAPI } from "../types/renderer-api";

const FALLBACK_PENDING_COLOR = new Color(1, 0, 1, 0.4);
const FALLBACK_ERROR_COLOR = new Color(1, 0, 0, 0.6);

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
  arcStart: 0,
  arcEnd: Math.PI * 2,
};

const SHARED_FALLBACK_SHAPE_DATA: ShapeRenderData = {
  type: "rectangle",
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  fill: new Color(),
  stroke: new Color(),
  strokeWidth: 2,
  arcStart: 0,
  arcEnd: Math.PI * 2,
};

export class Renderer2D implements Renderer {
  readonly #command: RenderCommand;
  readonly #showFallback: boolean;

  #sharedSpriteData: SpriteRenderData | undefined;

  public readonly config: RendererConfig;
  public readonly cache: TextureCache;

  constructor(rendererApi: RendererAPI, config: RendererConfig) {
    this.#command = new RenderCommand(rendererApi);
    this.#showFallback = config.showFallback;
    this.config = config;

    this.cache = new TextureCache({
      textureUploadBudget: this.config.textureUploadBudget,
      warnOnLazyLoad: this.config.warnOnLazyLoad,
    });
  }

  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): void {
    this.#command.initialize(canvas);
    this.cache.initialize(assets);
  }

  begin(): void {
    this.cache.resetFrameBudget();
    this.#command.beginFrame();
  }

  end(): void {
    this.#command.endFrame();
  }

  clear(color: Color): void {
    this.#command.clear(color);
  }

  render(renderable: Renderable, transform: Transform2D, alpha: number): void {
    if (renderable instanceof Sprite) {
      this.#renderSprite(renderable, transform, alpha);
      return;
    }

    if (renderable instanceof Shape) {
      this.#renderShape(renderable, transform, alpha);
      return;
    }
  }

  set(value: Settable, transform: Transform2D, alpha: number): void {
    if (!(value instanceof Camera)) {
      return;
    }

    const x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    const y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    const zoom = this.getHeight() / (value.orthoSize * 2);
    this.setCamera(x, y, zoom);
  }

  drawShape(data: ShapeRenderData): void {
    this.#command.drawShape(data);
  }

  setCamera(x: number, y: number, zoom: number): void {
    this.#command.setCamera(x, y, zoom);
  }

  getCameraX(): number {
    return this.#command.getCameraX();
  }

  getCameraY(): number {
    return this.#command.getCameraY();
  }

  getCameraZoom(): number {
    return this.#command.getCameraZoom();
  }

  getWidth(): number {
    return this.#command.getWidth();
  }

  getHeight(): number {
    return this.#command.getHeight();
  }

  #renderSprite(sprite: Sprite, transform: Transform2D, alpha: number): void {
    const textureInfo = this.cache.get(sprite.assetId);

    if (!textureInfo) {
      if (this.#showFallback) {
        const status = this.cache.getStatus(sprite.assetId);
        this.#drawFallback(sprite, transform, alpha, status.state);
      }
      return;
    }

    const image = this.cache.getImage(textureInfo.handle);
    if (!image) {
      return;
    }

    if (!this.#sharedSpriteData) {
      this.#sharedSpriteData = {
        image,
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
    }

    const spriteData = this.#sharedSpriteData;
    spriteData.image = image;
    spriteData.x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    spriteData.y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    spriteData.width = sprite.width || textureInfo.width;
    spriteData.height = sprite.height || textureInfo.height;
    spriteData.rotation = transform.curr.rotation;
    spriteData.scaleX = transform.curr.scale.x;
    spriteData.scaleY = transform.curr.scale.y;
    spriteData.anchorX = sprite.anchorX;
    spriteData.anchorY = sprite.anchorY;
    spriteData.sourceX = textureInfo.frameX;
    spriteData.sourceY = textureInfo.frameY;
    spriteData.sourceWidth = textureInfo.frameWidth;
    spriteData.sourceHeight = textureInfo.frameHeight;
    spriteData.flipX = sprite.flipX;
    spriteData.flipY = sprite.flipY;
    spriteData.tint = sprite.tint;

    this.#command.drawSprite(spriteData);
  }

  #renderShape(shape: Shape, transform: Transform2D, alpha: number): void {
    SHARED_SHAPE_DATA.type = shape.type;
    SHARED_SHAPE_DATA.x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    SHARED_SHAPE_DATA.y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    SHARED_SHAPE_DATA.width = shape.width;
    SHARED_SHAPE_DATA.height = shape.height;
    SHARED_SHAPE_DATA.rotation = transform.curr.rotation;
    SHARED_SHAPE_DATA.scaleX = transform.curr.scale.x;
    SHARED_SHAPE_DATA.scaleY = transform.curr.scale.y;
    SHARED_SHAPE_DATA.fill = shape.fill;
    SHARED_SHAPE_DATA.stroke = shape.stroke;
    SHARED_SHAPE_DATA.strokeWidth = shape.strokeWidth;
    SHARED_SHAPE_DATA.arcStart = shape.arcStart;
    SHARED_SHAPE_DATA.arcEnd = shape.arcEnd;

    this.#command.drawShape(SHARED_SHAPE_DATA);
  }

  #drawFallback(
    sprite: Sprite,
    transform: Transform2D,
    alpha: number,
    state: "pending" | "ready" | "error",
  ): void {
    SHARED_FALLBACK_SHAPE_DATA.type = "rectangle";
    SHARED_FALLBACK_SHAPE_DATA.x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    SHARED_FALLBACK_SHAPE_DATA.y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    SHARED_FALLBACK_SHAPE_DATA.width = sprite.width || 32;
    SHARED_FALLBACK_SHAPE_DATA.height = sprite.height || 32;
    SHARED_FALLBACK_SHAPE_DATA.rotation = transform.curr.rotation;
    SHARED_FALLBACK_SHAPE_DATA.scaleX = transform.curr.scale.x;
    SHARED_FALLBACK_SHAPE_DATA.scaleY = transform.curr.scale.y;

    const color = state === "error" ? FALLBACK_ERROR_COLOR : FALLBACK_PENDING_COLOR;
    SHARED_FALLBACK_SHAPE_DATA.fill.r = state === "error" ? color.r : color.r;
    SHARED_FALLBACK_SHAPE_DATA.fill.g = state === "error" ? color.g : color.g;
    SHARED_FALLBACK_SHAPE_DATA.fill.b = state === "error" ? color.b : color.b;
    SHARED_FALLBACK_SHAPE_DATA.fill.a = state === "error" ? color.a : 0.15;

    if (SHARED_FALLBACK_SHAPE_DATA.stroke) {
      SHARED_FALLBACK_SHAPE_DATA.stroke.r = color.r;
      SHARED_FALLBACK_SHAPE_DATA.stroke.g = color.g;
      SHARED_FALLBACK_SHAPE_DATA.stroke.b = color.b;
      SHARED_FALLBACK_SHAPE_DATA.stroke.a = color.a;
    }

    SHARED_FALLBACK_SHAPE_DATA.strokeWidth = 2;

    this.#command.drawShape(SHARED_FALLBACK_SHAPE_DATA);
  }
}

function lerp(prev: number, current: number, alpha: number): number {
  return prev + (current - prev) * alpha;
}
