import { Color } from "../components/sprite";
import type { Texture } from "../components/texture";
import { Renderer, ShapeRenderData, SpriteRenderData, TextureHandle } from "./renderer";

interface TextureEntry {
  handle: TextureHandle;
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement;
}

/**
 * Canvas 2D renderer implementation.
 * Simple and good for prototyping, debugging, and 2D games.
 */
export class Canvas2DRenderer implements Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Camera state
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraZoom: number = 1;
  
  // Texture management
  private nextTextureHandle: TextureHandle = 1;
  private texturesBySourceUid: Map<number, TextureEntry> = new Map();
  private texturesByHandle: Map<TextureHandle, TextureEntry> = new Map();

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("Failed to get 2D rendering context");
    }
  }

  beginFrame(): void {
    if (!this.ctx || !this.canvas) return;
    
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
      scaledH
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

  getWidth(): number {
    return this.canvas?.width ?? 0;
  }

  getHeight(): number {
    return this.canvas?.height ?? 0;
  }
}
