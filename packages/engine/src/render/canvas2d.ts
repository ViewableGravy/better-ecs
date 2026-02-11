import { AssetManager } from "../asset/AssetManager";
import { Color, Sprite } from "../components/sprite";
import type { Texture } from "../components/texture";
import type { Transform2D } from "../components/transform/transform2d";
import {
  DEFAULT_RENDERER_CONFIG,
  type Renderer,
  type RendererConfig,
  type ShapeRenderData,
  type SpriteRenderData,
  type TextureHandle,
  type TextureInfo,
  type TextureState,
  type TextureStatus,
} from "./renderer";

interface TextureEntry {
  handle: TextureHandle;
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement;
}

/** Maps asset IDs to their resolved TextureInfo for fast lookup. */
interface AssetTextureEntry {
  assetId: string;
  state: TextureState;
  info: TextureInfo | null;
  /** The underlying Texture object (null until resolved). */
  texture: Texture | null;
}

// Shared render data objects to avoid per-frame allocation
const SHARED_SPRITE_DATA: SpriteRenderData = {
  texture: 0,
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

// Fallback colors
const FALLBACK_PENDING_COLOR = new Color(1, 0, 1, 0.4); // semi-transparent magenta
const FALLBACK_ERROR_COLOR = new Color(1, 0, 0, 0.6); // semi-transparent red

/**
 * Canvas 2D renderer implementation.
 *
 * Supports the full asset-driven sprite rendering pipeline:
 * - Auto-resolves asset IDs to textures via the AssetManager
 * - Caches uploaded textures by source UID
 * - Respects per-frame upload budgets to avoid hitches
 * - Renders fallback placeholders for pending/errored textures
 * - Provides preload/evict APIs for explicit lifecycle control
 */
export class Canvas2DRenderer implements Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private assets!: AssetManager;

  public config: RendererConfig;

  // Camera state
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraZoom: number = 1;

  // Texture management (low-level, by source UID)
  private nextTextureHandle: TextureHandle = 1;
  private texturesBySourceUid: Map<number, TextureEntry> = new Map();
  private texturesByHandle: Map<TextureHandle, TextureEntry> = new Map();

  // Asset-level texture tracking (by asset ID)
  private assetTextures: Map<string, AssetTextureEntry> = new Map();

  // Per-frame upload budget tracking
  private uploadsThisFrame: number = 0;

  // Track asset IDs that have already been warned about lazy loading
  private lazyLoadWarned: Set<string> = new Set();

  constructor(config?: Partial<RendererConfig>) {
    this.config = { ...DEFAULT_RENDERER_CONFIG, ...config };
  }

  initialize(canvas: HTMLCanvasElement, assets: AssetManager): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;

    if (!this.ctx) {
      throw new Error("Failed to get 2D rendering context");
    }
  }

  // ── Frame lifecycle ──────────────────────────────────────────────

  beginFrame(): void {
    if (!this.ctx || !this.canvas) return;

    // Reset per-frame budget
    this.uploadsThisFrame = 0;

    // Reset transform
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  endFrame(): void {
    // Canvas2D is immediate mode, nothing to flush
  }

  clear(color: Color): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = color.toRgba();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setCamera(x: number, y: number, zoom: number): void {
    this.cameraX = x;
    this.cameraY = y;
    this.cameraZoom = zoom;
  }

  // ── High-level rendering (auto-resolve) ──────────────────────────

  renderSprite(sprite: Sprite, transform: Transform2D, alpha: number): void {
    if (!this.ctx || !this.canvas) return;

    const tex = this.getTexture(sprite.texture);

    if (!tex) {
      // Texture not yet available — render fallback
      if (this.config.showFallback) {
        const status = this.getTextureStatus(sprite.texture);
        this.drawFallback(sprite, transform, alpha, status.state);
      }
      return;
    }

    // Fill shared render data
    const d = SHARED_SPRITE_DATA;
    d.texture = tex.handle;
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

    this.drawSprite(d);
  }

  // ── Texture management ───────────────────────────────────────────

  getTexture(assetId: string): TextureInfo | null {
    // Fast path: already resolved and uploaded
    const existing = this.assetTextures.get(assetId);
    if (existing?.state === "ready" && existing.info) {
      return existing.info;
    }

    // Already in error state — don't retry
    if (existing?.state === "error") {
      return null;
    }

    // Check if asset is available in the AssetManager
    const texture = this.assets.get(assetId) as Texture | undefined;

    if (!texture) {
      // Asset not loaded yet — mark as pending
      if (!existing) {
        this.assetTextures.set(assetId, {
          assetId,
          state: "pending",
          info: null,
          texture: null,
        });
      }

      if (this.config.warnOnLazyLoad && !this.lazyLoadWarned.has(assetId)) {
        console.warn(
          `[Renderer] Texture "${assetId}" lazily loaded during render. ` +
            `Consider preloading in scene setup for smoother loading.`,
        );
        this.lazyLoadWarned.add(assetId);
      }

      return null;
    }

    // Asset is available — check upload budget
    if (
      this.config.textureUploadBudget > 0 &&
      this.uploadsThisFrame >= this.config.textureUploadBudget
    ) {
      // Budget exceeded — defer upload to next frame, mark pending
      if (!existing || existing.state !== "ready") {
        this.assetTextures.set(assetId, {
          assetId,
          state: "pending",
          info: null,
          texture,
        });
      }
      return null;
    }

    // Upload the texture
    const handle = this.loadTexture(texture);
    this.uploadsThisFrame++;

    const info: TextureInfo = {
      handle,
      width: texture.width,
      height: texture.height,
      frameX: texture.frameX,
      frameY: texture.frameY,
      frameWidth: texture.frameWidth,
      frameHeight: texture.frameHeight,
    };

    this.assetTextures.set(assetId, {
      assetId,
      state: "ready",
      info,
      texture,
    });

    return info;
  }

  getTextureStatus(assetId: string): TextureStatus {
    const entry = this.assetTextures.get(assetId);

    if (!entry) {
      return { state: "pending", info: null };
    }

    return { state: entry.state, info: entry.info };
  }

  loadTexture(texture: Texture): TextureHandle {
    const sourceUid = texture.source.uid;

    // Check if source already uploaded
    const existing = this.texturesBySourceUid.get(sourceUid);
    if (existing) {
      return existing.handle;
    }

    const handle = this.nextTextureHandle++;
    const entry: TextureEntry = { handle, image: texture.source.resource };

    this.texturesBySourceUid.set(sourceUid, entry);
    this.texturesByHandle.set(handle, entry);

    return handle;
  }

  getTextureHandle(sourceUid: number): TextureHandle | null {
    const entry = this.texturesBySourceUid.get(sourceUid);
    return entry ? entry.handle : null;
  }

  deleteTexture(handle: TextureHandle): void {
    const entry = this.texturesByHandle.get(handle);
    if (!entry) return;

    // Find and remove from source uid map
    for (const [uid, e] of this.texturesBySourceUid.entries()) {
      if (e.handle === handle) {
        this.texturesBySourceUid.delete(uid);
        break;
      }
    }

    this.texturesByHandle.delete(handle);
  }

  // ── Preload / eviction ───────────────────────────────────────────

  async preload(assetIds: string[]): Promise<void> {
    // Load all assets in parallel via the asset manager
    const loadPromises = assetIds.map((id) => this.assets.load(id));
    const results = await Promise.allSettled(loadPromises);

    // Upload all successfully loaded textures
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const result = results[i];

      if (result.status === "fulfilled") {
        const texture = result.value as Texture;
        const handle = this.loadTexture(texture);
        this.assetTextures.set(assetId, {
          assetId,
          state: "ready",
          info: {
            handle,
            width: texture.width,
            height: texture.height,
            frameX: texture.frameX,
            frameY: texture.frameY,
            frameWidth: texture.frameWidth,
            frameHeight: texture.frameHeight,
          },
          texture,
        });
      } else {
        this.assetTextures.set(assetId, {
          assetId,
          state: "error",
          info: null,
          texture: null,
        });
        console.error(`[Renderer] Failed to preload texture "${assetId}":`, result.reason);
      }
    }
  }

  evict(assetId: string): void {
    const entry = this.assetTextures.get(assetId);
    if (!entry?.info) {
      this.assetTextures.delete(assetId);
      return;
    }

    this.deleteTexture(entry.info.handle);
    this.assetTextures.delete(assetId);
    this.lazyLoadWarned.delete(assetId);
  }

  evictAll(): void {
    for (const entry of this.assetTextures.values()) {
      if (entry.info) {
        this.deleteTexture(entry.info.handle);
      }
    }
    this.assetTextures.clear();
    this.lazyLoadWarned.clear();
  }

  // ── Low-level draw primitives ────────────────────────────────────

  drawSprite(data: SpriteRenderData): void {
    if (!this.ctx || !this.canvas) return;

    const entry = this.texturesByHandle.get(data.texture);
    if (!entry) return;

    const image = entry.image;

    // Determine source dimensions
    const srcW = data.sourceWidth > 0 ? data.sourceWidth : image.width;
    const srcH = data.sourceHeight > 0 ? data.sourceHeight : image.height;

    // Calculate world to screen position
    const screenX = (data.x - this.cameraX) * this.cameraZoom + this.canvas.width / 2;
    const screenY = (data.y - this.cameraY) * this.cameraZoom + this.canvas.height / 2;

    // Calculate scaled dimensions
    const scaledW = data.width * Math.abs(data.scaleX) * this.cameraZoom;
    const scaledH = data.height * Math.abs(data.scaleY) * this.cameraZoom;

    this.ctx.save();

    // Move to position
    this.ctx.translate(screenX, screenY);

    // Apply rotation
    if (data.rotation !== 0) {
      this.ctx.rotate(data.rotation);
    }

    // Apply flip via negative scale
    const flipScaleX = (data.flipX ? -1 : 1) * (data.scaleX < 0 ? -1 : 1);
    const flipScaleY = (data.flipY ? -1 : 1) * (data.scaleY < 0 ? -1 : 1);
    if (flipScaleX !== 1 || flipScaleY !== 1) {
      this.ctx.scale(flipScaleX, flipScaleY);
    }

    // Apply tint via globalAlpha (simple approach - full tinting requires extra work)
    this.ctx.globalAlpha = data.tint.a;

    // Draw from anchor point
    const pivotOffsetX = -scaledW * data.anchorX;
    const pivotOffsetY = -scaledH * data.anchorY;

    this.ctx.drawImage(
      image,
      data.sourceX,
      data.sourceY,
      srcW,
      srcH,
      pivotOffsetX,
      pivotOffsetY,
      scaledW,
      scaledH,
    );

    this.ctx.restore();
  }

  drawShape(data: ShapeRenderData): void {
    if (!this.ctx || !this.canvas) return;

    // Calculate world to screen position
    const screenX = (data.x - this.cameraX) * this.cameraZoom + this.canvas.width / 2;
    const screenY = (data.y - this.cameraY) * this.cameraZoom + this.canvas.height / 2;

    // Calculate scaled dimensions
    const scaledW = data.width * data.scaleX * this.cameraZoom;
    const scaledH = data.height * data.scaleY * this.cameraZoom;

    this.ctx.save();

    // Move to position
    this.ctx.translate(screenX, screenY);

    // Apply rotation
    if (data.rotation !== 0) {
      this.ctx.rotate(data.rotation);
    }

    // Set styles
    this.ctx.fillStyle = data.fill.toRgba();
    if (data.stroke) {
      this.ctx.strokeStyle = data.stroke.toRgba();
      this.ctx.lineWidth = data.strokeWidth;
    }

    switch (data.type) {
      case "rectangle":
        this.ctx.beginPath();
        this.ctx.rect(-scaledW / 2, -scaledH / 2, scaledW, scaledH);
        this.ctx.fill();
        if (data.stroke) this.ctx.stroke();
        break;

      case "circle":
        this.ctx.beginPath();
        this.ctx.arc(0, 0, scaledW / 2, 0, Math.PI * 2);
        this.ctx.fill();
        if (data.stroke) this.ctx.stroke();
        break;

      case "line":
        if (data.stroke) {
          this.ctx.beginPath();
          this.ctx.moveTo(-scaledW / 2, 0);
          this.ctx.lineTo(scaledW / 2, 0);
          this.ctx.stroke();
        }
        break;
    }

    this.ctx.restore();
  }

  // ── Viewport ─────────────────────────────────────────────────────

  getWidth(): number {
    return this.canvas?.width ?? 0;
  }

  getHeight(): number {
    return this.canvas?.height ?? 0;
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Render a fallback placeholder for a sprite whose texture is not yet available.
   * Pending textures show a magenta outline; errored textures show a red X.
   */
  private drawFallback(
    sprite: Sprite,
    transform: Transform2D,
    alpha: number,
    state: TextureState,
  ): void {
    if (!this.ctx || !this.canvas) return;

    const x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
    const y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
    const w = sprite.width || 32;
    const h = sprite.height || 32;

    const screenX = (x - this.cameraX) * this.cameraZoom + this.canvas.width / 2;
    const screenY = (y - this.cameraY) * this.cameraZoom + this.canvas.height / 2;

    const scaledW = w * Math.abs(transform.curr.scale.x) * this.cameraZoom;
    const scaledH = h * Math.abs(transform.curr.scale.y) * this.cameraZoom;

    const color = state === "error" ? FALLBACK_ERROR_COLOR : FALLBACK_PENDING_COLOR;

    this.ctx.save();
    this.ctx.translate(screenX, screenY);

    if (transform.curr.rotation !== 0) {
      this.ctx.rotate(transform.curr.rotation);
    }

    const pivotX = -scaledW * sprite.anchorX;
    const pivotY = -scaledH * sprite.anchorY;

    // Draw outline rectangle
    this.ctx.strokeStyle = color.toRgba();
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(pivotX, pivotY, scaledW, scaledH);

    if (state === "error") {
      // Draw an X inside the rectangle for errors
      this.ctx.beginPath();
      this.ctx.moveTo(pivotX, pivotY);
      this.ctx.lineTo(pivotX + scaledW, pivotY + scaledH);
      this.ctx.moveTo(pivotX + scaledW, pivotY);
      this.ctx.lineTo(pivotX, pivotY + scaledH);
      this.ctx.stroke();
    } else {
      // Draw a dashed outline for pending
      this.ctx.setLineDash([4, 4]);
      this.ctx.fillStyle = color.toRgba();
      this.ctx.globalAlpha = 0.15;
      this.ctx.fillRect(pivotX, pivotY, scaledW, scaledH);
    }

    this.ctx.restore();
  }
}

// ── Utility ──────────────────────────────────────────────────────────

function lerp(prev: number, current: number, alpha: number): number {
  return prev + (current - prev) * alpha;
}
