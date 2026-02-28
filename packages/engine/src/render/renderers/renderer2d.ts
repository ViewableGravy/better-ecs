import type { ShaderSourceAsset } from "../../asset";
import type { LooseAssetManager } from "../../asset/AssetManager";
import { Camera } from "../../components/camera";
import { Shape } from "../../components/shape";
import { Color, Sprite } from "../../components/sprite";
import type { Texture } from "../../components/texture";
import type { ShaderTransform2D, Transform2D } from "../../components/transform";
import { RenderCommand } from "../render-command";
import { TextureCache } from "../textureCache/texture-cache";
import type {
    Renderable,
    Renderer,
    RendererConfig,
    Settable,
    ShaderQuadOptions,
    ShapeRenderData,
    SpriteRenderData,
    TexturedQuadDrawData,
    TexturedQuadRenderData,
} from "../types/renderer";
import type { RendererAPI } from "../types/renderer-api";

const FALLBACK_PENDING_COLOR = new Color(1, 0, 1, 0.4);
const FALLBACK_ERROR_COLOR = new Color(1, 0, 0, 0.6);
const DEFAULT_SHADER_QUAD_TINT = new Color(1, 1, 1, 1);

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
};

export class Renderer2D implements Renderer {
  readonly #command: RenderCommand;
  readonly #showFallback: boolean;

  #sharedSpriteData: SpriteRenderData | undefined;
  #sharedTexturedQuadData: TexturedQuadRenderData | undefined;

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

  async initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void> {
    await this.#command.initialize(canvas, assets);
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

  drawTexturedQuad(data: TexturedQuadDrawData): void {
    const image = data.texture ? this.#resolveTextureImage(data.texture) : null;
    if (data.texture && !image) {
      return;
    }

    const renderData = this.#sharedTexturedQuadData ?? (this.#sharedTexturedQuadData = {
      shader: data.shader,
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
      time: 0,
    });

    renderData.shader = data.shader;
    renderData.image = image;
    renderData.x = data.x;
    renderData.y = data.y;
    renderData.width = data.width;
    renderData.height = data.height;
    renderData.rotation = data.rotation;
    renderData.scaleX = data.scaleX;
    renderData.scaleY = data.scaleY;
    renderData.anchorX = data.anchorX;
    renderData.anchorY = data.anchorY;
    renderData.sourceX = data.texture?.frameX ?? 0;
    renderData.sourceY = data.texture?.frameY ?? 0;
    renderData.sourceWidth = data.texture?.frameWidth ?? 0;
    renderData.sourceHeight = data.texture?.frameHeight ?? 0;
    renderData.flipX = false;
    renderData.flipY = false;
    renderData.tint = data.tint ?? DEFAULT_SHADER_QUAD_TINT;
    renderData.time = data.time;

    this.#command.drawTexturedQuad(renderData);
  }

  drawShaderQuad(
    shader: ShaderSourceAsset,
    transform: ShaderTransform2D,
    options: ShaderQuadOptions = {},
  ): void {
    this.drawTexturedQuad({
      shader,
      texture: options.texture,
      x: transform.curr.pos.x,
      y: transform.curr.pos.y,
      width: transform.width,
      height: transform.height,
      rotation: transform.curr.rotation,
      scaleX: transform.curr.scale.x,
      scaleY: transform.curr.scale.y,
      anchorX: transform.anchorX,
      anchorY: transform.anchorY,
      tint: options.tint ?? DEFAULT_SHADER_QUAD_TINT,
      time: options.time ?? 0,
    });
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

  #resolveTextureImage(texture: Texture): HTMLImageElement | ImageBitmap | HTMLCanvasElement | null {
    const handle = this.cache.load(texture);
    return this.cache.getImage(handle);
  }
}

function lerp(prev: number, current: number, alpha: number): number {
  return prev + (current - prev) * alpha;
}
