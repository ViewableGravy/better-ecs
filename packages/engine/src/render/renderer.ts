import type { AssetManager } from "../asset/AssetManager";
import type { Sprite } from "../components/sprite";
import { Color } from "../components/sprite";
import type { Texture } from "../components/texture";
import type { Transform2D } from "../components/transform/transform2d";

/**
 * Opaque handle for loaded textures.
 * The actual type depends on the renderer implementation.
 */
export type TextureHandle = number;

/**
 * Metadata about a loaded texture.
 */
export interface TextureInfo {
  handle: TextureHandle;
  width: number;
  height: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
}

/**
 * The lifecycle state of a texture within the renderer.
 */
export type TextureState = "pending" | "ready" | "error";

/**
 * Describes the current status of a texture asset in the renderer.
 */
export interface TextureStatus {
  state: TextureState;
  /** The texture info, available when state is "ready". */
  info: TextureInfo | null;
}

/**
 * Data required to render a sprite.
 */
export interface SpriteRenderData {
  texture: TextureHandle;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  anchorX: number;
  anchorY: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  flipX: boolean;
  flipY: boolean;
  tint: Color;
}

/**
 * Data required to render a shape.
 */
export interface ShapeRenderData {
  type: "rectangle" | "circle" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  fill: Color;
  stroke: Color | null;
  strokeWidth: number;
}

/**
 * Configuration for renderer behavior.
 */
export interface RendererConfig {
  /**
   * Maximum number of new textures to upload per frame.
   * Prevents frame hitches from bulk texture uploads.
   * Set to 0 for unlimited. Default: 4.
   */
  textureUploadBudget: number;

  /**
   * Whether to render a fallback placeholder for sprites whose
   * textures are still loading. Default: true.
   */
  showFallback: boolean;

  /**
   * Whether to log warnings when textures are lazily loaded during
   * render (indicates missing preload). Default: true in dev mode.
   */
  warnOnLazyLoad: boolean;
}

const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  textureUploadBudget: 4,
  showFallback: true,
  warnOnLazyLoad: typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true,
};

export { DEFAULT_RENDERER_CONFIG };

/**
 * Minimal renderer interface.
 * Implementations can target Canvas2D, WebGL, WebGPU, etc.
 *
 * The renderer is created with an AssetManager so that it can automatically
 * resolve asset IDs to textures. Calling `renderSprite(sprite, transform, alpha)`
 * handles the full pipeline: asset resolution → texture upload → caching →
 * fallback rendering for pending assets → draw.
 */
export interface Renderer {
  /** Initialize the renderer with a canvas element and an asset manager */
  initialize(canvas: HTMLCanvasElement, assets: AssetManager): void;

  /** Get the renderer configuration */
  readonly config: RendererConfig;

  // ── Frame lifecycle ──────────────────────────────────────────────

  /** Begin a new frame (resets per-frame budgets) */
  beginFrame(): void;

  /** End the current frame */
  endFrame(): void;

  /** Clear the screen with a color */
  clear(color: Color): void;

  /** Set the camera transform (position and zoom) */
  setCamera(x: number, y: number, zoom: number): void;

  // ── High-level rendering (auto-resolve) ──────────────────────────

  /**
   * Render a sprite entity. Automatically resolves the sprite's asset ID
   * to a texture, uploads it if needed (respecting per-frame budget),
   * and draws the sprite. If the texture is not yet available, renders a
   * fallback placeholder (if configured).
   *
   * @param sprite    The Sprite component.
   * @param transform The Transform2D component.
   * @param alpha     Interpolation alpha for smooth rendering between updates.
   */
  renderSprite(sprite: Sprite, transform: Transform2D, alpha: number): void;

  /** Draw a shape */
  drawShape(data: ShapeRenderData): void;

  // ── Texture management ───────────────────────────────────────────

  /**
   * Get a texture handle and info from an asset ID.
   * Returns null if the texture is not yet available.
   * Triggers a lazy load if the asset is not loaded.
   */
  getTexture(assetId: string): TextureInfo | null;

  /**
   * Get the current state of a texture asset.
   */
  getTextureStatus(assetId: string): TextureStatus;

  /**
   * Load a texture from an engine Texture object, returns a handle.
   * Implementation should handle caching such that multiple calls with the
   * same TextureSource return the same handle.
   */
  loadTexture(texture: Texture): TextureHandle;

  /** Get a previously loaded texture handle by its source uid */
  getTextureHandle(sourceUid: number): TextureHandle | null;

  /** Delete a loaded texture and free associated resources */
  deleteTexture(handle: TextureHandle): void;

  // ── Preload / eviction ───────────────────────────────────────────

  /**
   * Preload textures for the given asset IDs. Returns a promise that
   * resolves when all textures are loaded and uploaded.
   * Use in scene setup to avoid lazy loading during render.
   */
  preload(assetIds: string[]): Promise<void>;

  /**
   * Evict a texture by asset ID, freeing GPU resources.
   * The texture can be re-loaded later on demand.
   */
  evict(assetId: string): void;

  /**
   * Evict all loaded textures and free GPU resources.
   */
  evictAll(): void;

  // ── Draw primitives (low-level) ──────────────────────────────────

  /** Draw a sprite from pre-resolved data */
  drawSprite(data: SpriteRenderData): void;

  // ── Viewport ─────────────────────────────────────────────────────

  /** Get canvas width */
  getWidth(): number;

  /** Get canvas height */
  getHeight(): number;
}
