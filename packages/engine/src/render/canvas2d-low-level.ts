import { Color } from "../components/sprite";
import type { LowLevelRenderer, ShapeRenderData, SpriteRenderData } from "./low-level";

/**
 * Canvas 2D implementation of the low-level renderer.
 *
 * Handles raw drawing primitives: sprites, shapes, camera transform,
 * frame lifecycle, and viewport queries against a CanvasRenderingContext2D.
 */
export class Canvas2DLowLevel implements LowLevelRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Camera state
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraZoom: number = 1;

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    if (!this.ctx) {
      throw new Error("Failed to get 2D rendering context");
    }
  }

  // ── Frame lifecycle ──────────────────────────────────────────────

  beginFrame(): void {
    if (!this.ctx) return;
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

  // ── Camera ───────────────────────────────────────────────────────

  setCamera(x: number, y: number, zoom: number): void {
    this.cameraX = x;
    this.cameraY = y;
    this.cameraZoom = zoom;
  }

  getCameraX(): number {
    return this.cameraX;
  }

  getCameraY(): number {
    return this.cameraY;
  }

  getCameraZoom(): number {
    return this.cameraZoom;
  }

  // ── Draw primitives ──────────────────────────────────────────────

  drawSprite(data: SpriteRenderData): void {
    if (!this.ctx || !this.canvas) return;

    const image = data.image;

    // Determine source dimensions
    const srcW = data.sourceWidth > 0 ? data.sourceWidth : image.width;
    const srcH = data.sourceHeight > 0 ? data.sourceHeight : image.height;

    // World to screen
    const screenX = (data.x - this.cameraX) * this.cameraZoom + this.canvas.width / 2;
    const screenY = (data.y - this.cameraY) * this.cameraZoom + this.canvas.height / 2;

    const scaledW = data.width * Math.abs(data.scaleX) * this.cameraZoom;
    const scaledH = data.height * Math.abs(data.scaleY) * this.cameraZoom;

    this.ctx.save();

    this.ctx.translate(screenX, screenY);

    if (data.rotation !== 0) {
      this.ctx.rotate(data.rotation);
    }

    const flipScaleX = (data.flipX ? -1 : 1) * (data.scaleX < 0 ? -1 : 1);
    const flipScaleY = (data.flipY ? -1 : 1) * (data.scaleY < 0 ? -1 : 1);
    if (flipScaleX !== 1 || flipScaleY !== 1) {
      this.ctx.scale(flipScaleX, flipScaleY);
    }

    this.ctx.globalAlpha = data.tint.a;

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

    const screenX = (data.x - this.cameraX) * this.cameraZoom + this.canvas.width / 2;
    const screenY = (data.y - this.cameraY) * this.cameraZoom + this.canvas.height / 2;

    const scaledW = data.width * data.scaleX * this.cameraZoom;
    const scaledH = data.height * data.scaleY * this.cameraZoom;

    this.ctx.save();

    this.ctx.translate(screenX, screenY);

    if (data.rotation !== 0) {
      this.ctx.rotate(data.rotation);
    }

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
}
