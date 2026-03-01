import { Color } from "@components/sprite/sprite";
import type {
  CircleShapeRenderData,
  DenseShapeRenderData,
  ShapeRenderInput,
  SpriteRenderData,
  TexturedQuadRenderData,
} from "@render/types/low-level";
import type { RendererAPI } from "@render/types/renderer-api";

/**
 * Canvas 2D implementation of the low-level renderer.
 *
 * Handles raw drawing primitives: sprites, shapes, camera transform,
 * frame lifecycle, and viewport queries against a CanvasRenderingContext2D.
 */
export class Canvas2DRenderAPI implements RendererAPI {
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

  setMeshOverlayEnabled(): void {
    return;
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

  drawTexturedQuad(data: TexturedQuadRenderData): void {
    if (!data.image) {
      return;
    }

    this.drawSprite({
      image: data.image,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      rotation: data.rotation,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      anchorX: data.anchorX,
      anchorY: data.anchorY,
      sourceX: data.sourceX,
      sourceY: data.sourceY,
      sourceWidth: data.sourceWidth,
      sourceHeight: data.sourceHeight,
      flipX: data.flipX,
      flipY: data.flipY,
      tint: data.tint,
    });
  }

  drawShape(data: ShapeRenderInput): void {
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

    const hasArcSlice = isCircleShapeData(data) && (data.arcEnabled ?? false);
    const arcStart = isCircleShapeData(data) ? (data.arcStart ?? 0) : 0;
    let arcEnd = isCircleShapeData(data) ? (data.arcEnd ?? Math.PI * 2) : Math.PI * 2;
    if (hasArcSlice && arcEnd < arcStart) {
      arcEnd += Math.PI * 2;
    }

    switch (data.type) {
      case "rectangle":
        this.ctx.beginPath();
        this.ctx.rect(-scaledW / 2, -scaledH / 2, scaledW, scaledH);
        if (data.fillEnabled ?? true) {
          this.ctx.fill();
        }
        if (data.stroke) this.ctx.stroke();
        break;

      case "rounded-rectangle": {
        const halfW = scaledW / 2;
        const halfH = scaledH / 2;
        const maxRadius = Math.min(halfW, halfH);
        const cornerRadius = Math.max(
          0,
          Math.min((data.cornerRadius ?? 0) * this.cameraZoom, maxRadius),
        );

        this.ctx.beginPath();
        this.ctx.roundRect(-halfW, -halfH, scaledW, scaledH, cornerRadius);
        if (data.fillEnabled ?? true) {
          this.ctx.fill();
        }
        if (data.stroke) {
          this.ctx.stroke();
        }
        break;
      }

      case "circle":
        this.ctx.beginPath();
        if (hasArcSlice) {
          if (data.fillEnabled ?? true) {
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, scaledW / 2, arcStart, arcEnd);
            this.ctx.closePath();
            this.ctx.fill();
          }

          if (data.stroke) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, scaledW / 2, arcStart, arcEnd);
            this.ctx.stroke();
          }
          break;
        }

        this.ctx.arc(0, 0, scaledW / 2, 0, Math.PI * 2);
        if (data.fillEnabled ?? true) {
          this.ctx.fill();
        }
        if (data.stroke) {
          this.ctx.stroke();
        }
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

function isCircleShapeData(data: ShapeRenderInput): data is CircleShapeRenderData | DenseShapeRenderData {
  return data.type === "circle";
}
